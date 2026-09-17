 import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import './bot-editor.scss';

type BotEditorProps = {
    selectedBotId?: string;
    selectedBotName?: string;
};

type BotConfig = {
    name: string;
    description: string;
    quickStrategy: string;
    defaultCategory: string;
    defaultType: string;
};

type TradeCategory = {
    id: string;
    label: string;
    types: string[];
};

const BOT_CONFIGS: Record<string, BotConfig> = {
    pulse: {
        name: 'Pulse Bot',
        description:
            'A selective digit-based bot configured for Even/Odd trading.',
        quickStrategy: 'Even / Odd',
        defaultCategory: 'Digits',
        defaultType: 'Even / Odd',
    },

    volt: {
        name: 'Volt Bot',
        description:
            'A fast digit-based bot configured for Over/Under trading.',
        quickStrategy: 'Over / Under',
        defaultCategory: 'Digits',
        defaultType: 'Over / Under',
    },

    cipher: {
        name: 'Cipher Bot',
        description:
            'A configurable pattern-based trading bot.',
        quickStrategy: 'Pattern Strategy',
        defaultCategory: 'Digits',
        defaultType: 'Matches / Differs',
    },

    vector: {
        name: 'Vector Bot',
        description:
            'A directional trading bot for movement-based contracts.',
        quickStrategy: 'Directional Strategy',
        defaultCategory: 'Up / Down',
        defaultType: 'Rise / Fall',
    },

    nexus: {
        name: 'Nexus Bot',
        description:
            'A multi-condition bot for confirmed trading setups.',
        quickStrategy: 'Multi-Condition Strategy',
        defaultCategory: 'Up / Down',
        defaultType: 'Higher / Lower',
    },

    prime: {
        name: 'Prime Bot',
        description:
            'A number-focused bot for selective digit contracts.',
        quickStrategy: 'Digit Strategy',
        defaultCategory: 'Digits',
        defaultType: 'Even / Odd',
    },

    orbit: {
        name: 'Orbit Bot',
        description:
            'A dedicated bot with its own configurable trading workflow.',
        quickStrategy: 'Orbit Strategy',
        defaultCategory: 'Accumulators',
        defaultType: 'Accumulators',
    },
};

const MARKET_GROUPS = [
    {
        id: 'derived',
        label: 'Derived',
        children: [
            {
                id: 'continuous',
                label: 'Continuous Indices',
            },
        ],
    },
];

const CONTINUOUS_INDICES = [
    'Volatility 10',
    'Volatility 25',
    'Volatility 50',
    'Volatility 75',
    'Volatility 100',
    'Volatility 10 (1s)',
    'Volatility 25 (1s)',
    'Volatility 50 (1s)',
    'Volatility 75 (1s)',
    'Volatility 100 (1s)',
    'Boom 300 Index',
    'Boom 500 Index',
    'Boom 1000 Index',
    'Crash 300 Index',
    'Crash 500 Index',
    'Crash 1000 Index',
];

const TRADE_CATEGORIES: TradeCategory[] = [
    {
        id: 'up-down',
        label: 'Up / Down',
        types: [
            'Rise / Fall',
            'Higher / Lower',
        ],
    },
    {
        id: 'touch',
        label: 'Touch / No Touch',
        types: [
            'Touch / No Touch',
        ],
    },
    {
        id: 'digits',
        label: 'Digits',
        types: [
            'Even / Odd',
            'Over / Under',
            'Matches / Differs',
        ],
    },
    {
        id: 'in-out',
        label: 'In / Out',
        types: [
            'Ends In / Ends Out',
            'Stays In / Goes Out',
        ],
    },
    {
        id: 'asian',
        label: 'Asian',
        types: [
            'Asian Up',
            'Asian Down',
        ],
    },
    {
        id: 'accumulators',
        label: 'Accumulators',
        types: [
            'Accumulators',
        ],
    },
];

const getBotConfig = (botId: string): BotConfig =>
    BOT_CONFIGS[botId] || BOT_CONFIGS.pulse;

const getTradeCategory = (type: string) =>
    TRADE_CATEGORIES.find(category =>
        category.types.includes(type)
    );

const BotEditor = observer(
    ({
        selectedBotId = 'pulse',
        selectedBotName,
    }: BotEditorProps) => {
        const botConfig = getBotConfig(selectedBotId);

        const botName =
            selectedBotName || botConfig.name;

        /*
         * ----------------------------------------
         * MARKET
         * ----------------------------------------
         */

        const [marketGroup, setMarketGroup] =
            useState('Derived');

        const [marketSubGroup, setMarketSubGroup] =
            useState('Continuous Indices');

        const [market, setMarket] =
            useState('Volatility 10');

        /*
         * ----------------------------------------
         * TRADE TYPE
         * ----------------------------------------
         */

        const [tradeCategory, setTradeCategory] =
            useState(botConfig.defaultCategory);

        const [tradeType, setTradeType] =
            useState(botConfig.defaultType);

        /*
         * ----------------------------------------
         * CONTRACT SETTINGS
         * ----------------------------------------
         */

        const [contract, setContract] =
            useState('');

        const [duration, setDuration] =
            useState('1');

        const [durationUnit, setDurationUnit] =
            useState('Ticks');

        const [barrier, setBarrier] =
            useState('5');

        const [prediction, setPrediction] =
            useState('5');

        const [matchDigit, setMatchDigit] =
            useState('0');

        const [rangeLow, setRangeLow] =
            useState('0');

        const [rangeHigh, setRangeHigh] =
            useState('9');

        const [accumulatorGrowth, setAccumulatorGrowth] =
            useState('1.00');

        /*
         * ----------------------------------------
         * MONEY MANAGEMENT
         * ----------------------------------------
         */

        const [stake, setStake] =
            useState('0.35');

        const [martingale, setMartingale] =
            useState('1.00');

        const [takeProfit, setTakeProfit] =
            useState('10');

        const [stopLoss, setStopLoss] =
            useState('10');

        /*
         * ----------------------------------------
         * BOT STATE
         * ----------------------------------------
         *
         * This only represents the editor state.
         * Actual Deriv execution will be connected
         * to the existing Nova Traders run engine.
         */

        const [isRunning, setIsRunning] =
            useState(false);

        /*
         * Reset editor when another bot is selected.
         */

        useEffect(() => {
            const category =
                getTradeCategory(
                    botConfig.defaultType
                );

            setTradeCategory(
                category?.label ||
                    botConfig.defaultCategory
            );

            setTradeType(
                botConfig.defaultType
            );

            setContract('');

            setIsRunning(false);
        }, [
            selectedBotId,
            botConfig.defaultCategory,
            botConfig.defaultType,
        ]);

        /*
         * ----------------------------------------
         * CURRENT TRADE TYPES
         * ----------------------------------------
         */

        const currentTradeTypes =
            useMemo(() => {
                return (
                    TRADE_CATEGORIES.find(
                        category =>
                            category.label ===
                            tradeCategory
                    )?.types || []
                );
            }, [tradeCategory]);

        /*
         * ----------------------------------------
         * MARKET CHANGE
         * ----------------------------------------
         */

        const handleMarketChange = (
            value: string
        ) => {
            setMarket(value);
        };

        /*
         * ----------------------------------------
         * TRADE CATEGORY CHANGE
         * ----------------------------------------
         */

        const handleTradeCategoryChange = (
            category: TradeCategory
        ) => {
            setTradeCategory(category.label);

            const firstType =
                category.types[0] || '';

            setTradeType(firstType);
            setContract('');
        };

        /*
         * ----------------------------------------
         * TRADE TYPE CHANGE
         * ----------------------------------------
         */

        const handleTradeTypeChange = (
            value: string
        ) => {
            setTradeType(value);
            setContract('');
        };

        /*
         * ----------------------------------------
         * CONTRACT OPTIONS
         * ----------------------------------------
         */

        const contractOptions =
            useMemo(() => {
                switch (tradeType) {
                    case 'Rise / Fall':
                        return ['Rise', 'Fall'];

                    case 'Higher / Lower':
                        return [
                            'Higher',
                            'Lower',
                        ];

                    case 'Touch / No Touch':
                        return [
                            'Touch',
                            'No Touch',
                        ];

                    case 'Even / Odd':
                        return ['Even', 'Odd'];

                    case 'Over / Under':
                        return ['Over', 'Under'];

                    case 'Matches / Differs':
                        return [
                            'Matches',
                            'Differs',
                        ];

                    case 'Ends In / Ends Out':
                        return [
                            'Ends In',
                            'Ends Out',
                        ];

                    case 'Stays In / Goes Out':
                        return [
                            'Stays In',
                            'Goes Out',
                        ];

                    case 'Asian Up':
                        return ['Asian Up'];

                    case 'Asian Down':
                        return ['Asian Down'];

                    case 'Accumulators':
                        return ['Accumulators'];

                    default:
                        return [];
                }
            }, [tradeType]);

        /*
         * Automatically select the first contract
         * when a contract type changes.
         */

        useEffect(() => {
            setContract(
                contractOptions[0] || ''
            );
        }, [contractOptions]);

        /*
         * ----------------------------------------
         * VALIDATION
         * ----------------------------------------
         */

        const validateSettings = () => {
            const stakeValue =
                Number(stake);

            const martingaleValue =
                Number(martingale);

            const takeProfitValue =
                Number(takeProfit);

            const stopLossValue =
                Number(stopLoss);

            const durationValue =
                Number(duration);

            if (
                !Number.isFinite(
                    stakeValue
                ) ||
                stakeValue <= 0
            ) {
                window.alert(
                    'Please enter a valid stake.'
                );

                return false;
            }

            if (
                !Number.isFinite(
                    martingaleValue
                ) ||
                martingaleValue < 1
            ) {
                window.alert(
                    'Martingale must be 1.00 or higher.'
                );

                return false;
            }

            if (
                !Number.isFinite(
                    takeProfitValue
                ) ||
                takeProfitValue < 0
            ) {
                window.alert(
                    'Please enter a valid Take Profit.'
                );

                return false;
            }

            if (
                !Number.isFinite(
                    stopLossValue
                ) ||
                stopLossValue < 0
            ) {
                window.alert(
                    'Please enter a valid Stop Loss.'
                );

                return false;
            }

            if (
                !Number.isFinite(
                    durationValue
                ) ||
                durationValue <= 0
            ) {
                window.alert(
                    'Please enter a valid duration.'
                );

                return false;
            }

            if (!market) {
                window.alert(
                    'Please select a market.'
                );

                return false;
            }

            if (!tradeType) {
                window.alert(
                    'Please select a trade type.'
                );

                return false;
            }

            return true;
        };

        /*
         * ----------------------------------------
         * RUN BOT
         * ----------------------------------------
         *
         * IMPORTANT:
         * This intentionally does not create fake
         * transactions or fake analysis.
         *
         * The existing Nova Traders run engine
         * should be connected here.
         */

        const handleRunBot = () => {
            if (!validateSettings()) {
                return;
            }

            setIsRunning(true);

            /*
             * The real bot execution hook will be
             * connected to the existing RunPanel /
             * run-panel-store / Deriv execution
             * infrastructure.
             *
             * For now this only changes the editor
             * state so the UI is ready.
             */
        };

        /*
         * ----------------------------------------
         * STOP BOT
         * ----------------------------------------
         */

        const handleStopBot = () => {
            setIsRunning(false);

            /*
             * The real stop action will later be
             * connected to the existing bot engine.
             */
        };

        /*
         * ----------------------------------------
         * CONTRACT PARAMETER UI
         * ----------------------------------------
         */

        const renderContractParameters = () => {
            switch (tradeType) {
                case 'Rise / Fall':
                case 'Asian Up':
                case 'Asian Down':
                    return (
                        <>
                            <Parameter
                                label='CONTRACT'
                                control={
                                    <select
                                        value={
                                            contract
                                        }
                                        onChange={event =>
                                            setContract(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {contractOptions.map(
                                            option => (
                                                <option
                                                    key={
                                                        option
                                                    }
                                                    value={
                                                        option
                                                    }
                                                >
                                                    {
                                                        option
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                }
                            />

                            <Parameter
                                label='DURATION'
                                control={
                                    <input
                                        type='number'
                                        min='1'
                                        value={
                                            duration
                                        }
                                        onChange={event =>
                                            setDuration(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />
                        </>
                    );

                case 'Higher / Lower':
                    return (
                        <>
                            <Parameter
                                label='CONTRACT'
                                control={
                                    <select
                                        value={
                                            contract
                                        }
                                        onChange={event =>
                                            setContract(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {contractOptions.map(
                                            option => (
                                                <option
                                                    key={
                                                        option
                                                    }
                                                    value={
                                                        option
                                                    }
                                                >
                                                    {
                                                        option
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                }
                            />

                            <Parameter
                                label='PREDICTION'
                                control={
                                    <input
                                        type='number'
                                        value={
                                            prediction
                                        }
                                        onChange={event =>
                                            setPrediction(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />

                            <Parameter
                                label='DURATION'
                                control={
                                    <input
                                        type='number'
                                        min='1'
                                        value={
                                            duration
                                        }
                                        onChange={event =>
                                            setDuration(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />
                        </>
                    );

                case 'Touch / No Touch':
                    return (
                        <>
                            <Parameter
                                label='CONTRACT'
                                control={
                                    <select
                                        value={
                                            contract
                                        }
                                        onChange={event =>
                                            setContract(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {contractOptions.map(
                                            option => (
                                                <option
                                                    key={
                                                        option
                                                    }
                                                    value={
                                                        option
                                                    }
                                                >
                                                    {
                                                        option
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                }
                            />

                            <Parameter
                                label='BARRIER'
                                control={
                                    <input
                                        type='number'
                                        value={
                                            barrier
                                        }
                                        onChange={event =>
                                            setBarrier(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />

                            <Parameter
                                label='DURATION'
                                control={
                                    <input
                                        type='number'
                                        min='1'
                                        value={
                                            duration
                                        }
                                        onChange={event =>
                                            setDuration(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />
                        </>
                    );

                case 'Even / Odd':
                    return (
                        <>
                            <Parameter
                                label='CONTRACT'
                                control={
                                    <select
                                        value={
                                            contract
                                        }
                                        onChange={event =>
                                            setContract(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {contractOptions.map(
                                            option => (
                                                <option
                                                    key={
                                                        option
                                                    }
                                                    value={
                                                        option
                                                    }
                                                >
                                                    {
                                                        option
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                }
                            />

                            <Parameter
                                label='DURATION'
                                control={
                                    <input
                                        type='number'
                                        min='1'
                                        value={
                                            duration
                                        }
                                        onChange={event =>
                                            setDuration(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />
                        </>
                    );

                case 'Over / Under':
                    return (
                        <>
                            <Parameter
                                label='CONTRACT'
                                control={
                                    <select
                                        value={
                                            contract
                                        }
                                        onChange={event =>
                                            setContract(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {contractOptions.map(
                                            option => (
                                                <option
                                                    key={
                                                        option
                                                    }
                                                    value={
                                                        option
                                                    }
                                                >
                                                    {
                                                        option
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                }
                            />

                            <Parameter
                                label='BARRIER'
                                control={
                                    <select
                                        value={
                                            barrier
                                        }
                                        onChange={event =>
                                            setBarrier(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {Array.from(
                                            {
                                                length: 10,
                                            },
                                            (_, index) => (
                                                <option
                                                    key={
                                                        index
                                                    }
                                                    value={
                                                        index
                                                    }
                                                >
                                                    {
                                                        index
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                }
                            />

                            <Parameter
                                label='DURATION'
                                control={
                                    <input
                                        type='number'
                                        min='1'
                                        value={
                                            duration
                                        }
                                        onChange={event =>
                                            setDuration(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />
                        </>
                    );

                case 'Matches / Differs':
                    return (
                        <>
                            <Parameter
                                label='CONTRACT'
                                control={
                                    <select
                                        value={
                                            contract
                                        }
                                        onChange={event =>
                                            setContract(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {contractOptions.map(
                                            option => (
                                                <option
                                                    key={
                                                        option
                                                    }
                                                    value={
                                                        option
                                                    }
                                                >
                                                    {
                                                        option
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                }
                            />

                            <Parameter
                                label='DIGIT'
                                control={
                                    <select
                                        value={
                                            matchDigit
                                        }
                                        onChange={event =>
                                            setMatchDigit(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {Array.from(
                                            {
                                                length: 10,
                                            },
                                            (_, index) => (
                                                <option
                                                    key={
                                                        index
                                                    }
                                                    value={
                                                        index
                                                    }
                                                >
                                                    {
                                                        index
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                }
                            />

                            <Parameter
                                label='DURATION'
                                control={
                                    <input
                                        type='number'
                                        min='1'
                                        value={
                                            duration
                                        }
                                        onChange={event =>
                                            setDuration(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />
                        </>
                    );

                case 'Ends In / Ends Out':
                case 'Stays In / Goes Out':
                    return (
                        <>
                            <Parameter
                                label='CONTRACT'
                                control={
                                    <select
                                        value={
                                            contract
                                        }
                                        onChange={event =>
                                            setContract(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {contractOptions.map(
                                            option => (
                                                <option
                                                    key={
                                                        option
                                                    }
                                                    value={
                                                        option
                                                    }
                                                >
                                                    {
                                                        option
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                }
                            />

                            <Parameter
                                label='RANGE LOW'
                                control={
                                    <input
                                        type='number'
                                        value={
                                            rangeLow
                                        }
                                        onChange={event =>
                                            setRangeLow(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />

                            <Parameter
                                label='RANGE HIGH'
                                control={
                                    <input
                                        type='number'
                                        value={
                                            rangeHigh
                                        }
                                        onChange={event =>
                                            setRangeHigh(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />

                            <Parameter
                                label='DURATION'
                                control={
                                    <input
                                        type='number'
                                        min='1'
                                        value={
                                            duration
                                        }
                                        onChange={event =>
                                            setDuration(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />
                        </>
                    );

                case 'Accumulators':
                    return (
                        <>
                            <Parameter
                                label='GROWTH PERCENTAGE'
                                control={
                                    <input
                                        type='number'
                                        min='0'
                                        step='0.01'
                                        value={
                                            accumulatorGrowth
                                        }
                                        onChange={event =>
                                            setAccumulatorGrowth(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />

                            <Parameter
                                label='DURATION'
                                control={
                                    <input
                                        type='number'
                                        min='1'
                                        value={
                                            duration
                                        }
                                        onChange={event =>
                                            setDuration(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                }
                            />
                        </>
                    );

                default:
                    return null;
            }
        };

        return (
            <div className='bot-editor'>
                {/* HEADER */}

                <header className='bot-editor__header'>
                    <div className='bot-editor__header-main'>
                        <div className='bot-editor__bot-icon'>
                            {botName
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>
                            <div className='bot-editor__eyebrow'>
                                BOT EDITOR
                            </div>

                            <h1>{botName}</h1>

                            <p>
                                {
                                    botConfig.description
                                }
                            </p>
                        </div>
                    </div>

                    <div
                        className={`bot-editor__status ${
                            isRunning
                                ? 'is-running'
                                : ''
                        }`}
                    >
                        <span />

                        {isRunning
                            ? 'BOT RUNNING'
                            : 'READY'}
                    </div>
                </header>

                <div className='bot-editor__layout'>
                    <main className='bot-editor__main'>
                        {/* QUICK STRATEGY */}

                        <section className='bot-editor__section'>
                            <div className='bot-editor__section-heading'>
                                <div>
                                    <span>
                                        QUICK STRATEGY
                                    </span>

                                    <h2>
                                        {
                                            botConfig.quickStrategy
                                        }
                                    </h2>

                                    <p>
                                        The default
                                        strategy
                                        configured for
                                        this bot.
                                    </p>
                                </div>

                                <div className='bot-editor__strategy-badge'>
                                    ACTIVE
                                </div>
                            </div>

                            <div className='bot-editor__strategy-note'>
                                <div className='bot-editor__strategy-icon'>
                                    ⚡
                                </div>

                                <div>
                                    <strong>
                                        Manual analysis
                                        first
                                    </strong>

                                    <p>
                                        Use the Analysis
                                        Tool to study
                                        the market and
                                        find your setup.
                                        This editor does
                                        not analyse the
                                        market
                                        automatically.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* TRADE PARAMETERS */}

                        <section className='bot-editor__section'>
                            <div className='bot-editor__section-heading'>
                                <div>
                                    <span>
                                        TRADE PARAMETERS
                                    </span>

                                    <h2>
                                        Contract
                                        configuration
                                    </h2>

                                    <p>
                                        Choose the market
                                        and contract the
                                        bot will execute.
                                    </p>
                                </div>
                            </div>

                            {/* MARKET */}

                            <div className='bot-editor__group'>
                                <div className='bot-editor__group-heading'>
                                    <span>
                                        01
                                    </span>

                                    <div>
                                        <strong>
                                            MARKET
                                        </strong>

                                        <p>
                                            Derived →
                                            Continuous
                                            Indices
                                        </p>
                                    </div>
                                </div>

                                <div className='bot-editor__market-path'>
                                    <div className='bot-editor__path-item'>
                                        <span>
                                            MARKET
                                        </span>

                                        <strong>
                                            {marketGroup}
                                        </strong>
                                    </div>

                                    <div className='bot-editor__path-arrow'>
                                        →
                                    </div>

                                    <div className='bot-editor__path-item'>
                                        <span>
                                            CATEGORY
                                        </span>

                                        <strong>
                                            {
                                                marketSubGroup
                                            }
                                        </strong>
                                    </div>
                                </div>

                                <div className='bot-editor__grid bot-editor__grid--three'>
                                    <Parameter
                                        label='MARKET'
                                        control={
                                            <select
                                                value={
                                                    market
                                                }
                                                onChange={event =>
                                                    handleMarketChange(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            >
                                                {CONTINUOUS_INDICES.map(
                                                    item => (
                                                        <option
                                                            key={
                                                                item
                                                            }
                                                            value={
                                                                item
                                                            }
                                                        >
                                                            {
                                                                item
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        }
                                    />

                                    <Parameter
                                        label='MARKET FAMILY'
                                        control={
                                            <select
                                                value={
                                                    marketGroup
                                                }
                                                onChange={event =>
                                                    setMarketGroup(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            >
                                                {MARKET_GROUPS.map(
                                                    group => (
                                                        <option
                                                            key={
                                                                group.id
                                                            }
                                                            value={
                                                                group.label
                                                            }
                                                        >
                                                            {
                                                                group.label
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        }
                                    />

                                    <Parameter
                                        label='INDEX CATEGORY'
                                        control={
                                            <select
                                                value={
                                                    marketSubGroup
                                                }
                                                onChange={event =>
                                                    setMarketSubGroup(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            >
                                                <option>
                                                    Continuous
                                                    Indices
                                                </option>
                                            </select>
                                        }
                                    />
                                </div>
                            </div>

                            {/* TRADE TYPE */}

                            <div className='bot-editor__group'>
                                <div className='bot-editor__group-heading'>
                                    <span>
                                        02
                                    </span>

                                    <div>
                                        <strong>
                                            TRADE TYPE
                                        </strong>

                                        <p>
                                            Select a
                                            contract
                                            family.
                                        </p>
                                    </div>
                                </div>

                                <div className='bot-editor__trade-layout'>
                                    <div className='bot-editor__trade-categories'>
                                        {TRADE_CATEGORIES.map(
                                            category => (
                                                <button
                                                    key={
                                                        category.id
                                                    }
                                                    type='button'
                                                    className={
                                                        tradeCategory ===
                                                        category.label
                                                            ? 'active'
                                                            : ''
                                                    }
                                                    onClick={() =>
                                                        handleTradeCategoryChange(
                                                            category
                                                        )
                                                    }
                                                >
                                                    {
                                                        category.label
                                                    }
                                                </button>
                                            )
                                        )}
                                    </div>

                                    <div className='bot-editor__trade-types'>
                                        <div className='bot-editor__trade-types-label'>
                                            CONTRACT TYPE
                                        </div>

                                        {currentTradeTypes.map(
                                            type => (
                                                <button
                                                    key={
                                                        type
                                                    }
                                                    type='button'
                                                    className={
                                                        tradeType ===
                                                        type
                                                            ? 'active'
                                                            : ''
                                                    }
                                                    onClick={() =>
                                                        handleTradeTypeChange(
                                                            type
                                                        )
                                                    }
                                                >
                                                    {
                                                        type
                                                    }
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* CONTRACT PARAMETERS */}

                            <div className='bot-editor__group'>
                                <div className='bot-editor__group-heading'>
                                    <span>
                                        03
                                    </span>

                                    <div>
                                        <strong>
                                            CONTRACT
                                            PARAMETERS
                                        </strong>

                                        <p>
                                            Configure the
                                            selected
                                            contract.
                                        </p>
                                    </div>
                                </div>

                                <div className='bot-editor__grid'>
                                    {renderContractParameters()}
                                </div>
                            </div>

                            {/* DURATION */}

                            <div className='bot-editor__group'>
                                <div className='bot-editor__group-heading'>
                                    <span>
                                        04
                                    </span>

                                    <div>
                                        <strong>
                                            DURATION
                                        </strong>

                                        <p>
                                            Set how long
                                            the contract
                                            remains active.
                                        </p>
                                    </div>
                                </div>

                                <div className='bot-editor__grid'>
                                    <Parameter
                                        label='DURATION'
                                        control={
                                            <input
                                                type='number'
                                                min='1'
                                                value={
                                                    duration
                                                }
                                                onChange={event =>
                                                    setDuration(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        }
                                    />

                                    <Parameter
                                        label='UNIT'
                                        control={
                                            <select
                                                value={
                                                    durationUnit
                                                }
                                                onChange={event =>
                                                    setDurationUnit(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            >
                                                <option>
                                                    Ticks
                                                </option>

                                                <option>
                                                    Seconds
                                                </option>

                                                <option>
                                                    Minutes
                                                </option>

                                                <option>
                                                    Hours
                                                </option>
                                            </select>
                                        }
                                    />
                                </div>
                            </div>

                            {/* MONEY MANAGEMENT */}

                            <div className='bot-editor__group'>
                                <div className='bot-editor__group-heading'>
                                    <span>
                                        05
                                    </span>

                                    <div>
                                        <strong>
                                            MONEY MANAGEMENT
                                        </strong>

                                        <p>
                                            Configure stake
                                            and risk
                                            controls.
                                        </p>
                                    </div>
                                </div>

                                <div className='bot-editor__grid bot-editor__grid--four'>
                                    <Parameter
                                        label='STAKE'
                                        control={
                                            <input
                                                type='number'
                                                min='0.35'
                                                step='0.01'
                                                value={
                                                    stake
                                                }
                                                onChange={event =>
                                                    setStake(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        }
                                    />

                                    <Parameter
                                        label='MARTINGALE'
                                        control={
                                            <input
                                                type='number'
                                                min='1'
                                                step='0.01'
                                                value={
                                                    martingale
                                                }
                                                onChange={event =>
                                                    setMartingale(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        }
                                    />

                                    <Parameter
                                        label='TAKE PROFIT'
                                        control={
                                            <input
                                                type='number'
                                                min='0'
                                                step='0.01'
                                                value={
                                                    takeProfit
                                                }
                                                onChange={event =>
                                                    setTakeProfit(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        }
                                    />

                                    <Parameter
                                        label='STOP LOSS'
                                        control={
                                            <input
                                                type='number'
                                                min='0'
                                                step='0.01'
                                                value={
                                                    stopLoss
                                                }
                                                onChange={event =>
                                                    setStopLoss(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        {/* RUN */}

                        <section className='bot-editor__run-area'>
                            <div>
                                <div className='bot-editor__run-label'>
                                    {isRunning
                                        ? 'BOT RUNNING'
                                        : 'READY TO TRADE'}
                                </div>

                                <h3>
                                    {isRunning
                                        ? `${botName} is active`
                                        : 'Analysis complete? Start the bot.'}
                                </h3>

                                <p>
                                    {isRunning
                                        ? 'The bot is ready for the execution engine to manage its contracts.'
                                        : 'Analyse the market first, then press RUN BOT when your setup is confirmed.'}
                                </p>
                            </div>

                            {!isRunning ? (
                                <button
                                    type='button'
                                    className='bot-editor__run'
                                    onClick={
                                        handleRunBot
                                    }
                                >
                                    <span>
                                        ▶
                                    </span>

                                    RUN BOT
                                </button>
                            ) : (
                                <button
                                    type='button'
                                    className='bot-editor__stop'
                                    onClick={
                                        handleStopBot
                                    }
                                >
                                    <span>
                                        ■
                                    </span>

                                    STOP BOT
                                </button>
                            )}
                        </section>
                    </main>

                    {/* SUMMARY */}

                    <aside className='bot-editor__sidebar'>
                        <div className='bot-editor__summary'>
                            <div className='bot-editor__summary-heading'>
                                <span>
                                    BOT SUMMARY
                                </span>

                                <h2>
                                    {botName}
                                </h2>
                            </div>

                            <SummaryItem
                                label='MARKET'
                                value={market}
                            />

                            <SummaryItem
                                label='CATEGORY'
                                value={`${marketGroup} / ${marketSubGroup}`}
                            />

                            <SummaryItem
                                label='TRADE TYPE'
                                value={tradeCategory}
                            />

                            <SummaryItem
                                label='CONTRACT'
                                value={
                                    contract ||
                                    tradeType
                                }
                            />

                            <SummaryItem
                                label='DURATION'
                                value={`${duration} ${durationUnit}`}
                            />

                            <SummaryItem
                                label='STAKE'
                                value={`$${stake}`}
                            />

                            <SummaryItem
                                label='MARTINGALE'
                                value={martingale}
                            />

                            <SummaryItem
                                label='TAKE PROFIT'
                                value={`$${takeProfit}`}
                            />

                            <SummaryItem
                                label='STOP LOSS'
                                value={`$${stopLoss}`}
                            />

                            <div className='bot-editor__summary-status'>
                                <span
                                    className={
                                        isRunning
                                            ? 'active'
                                            : ''
                                    }
                                />

                                {isRunning
                                    ? 'RUNNING'
                                    : 'READY'}
                            </div>
                        </div>

                        <div className='bot-editor__manual-note'>
                            <span>
                                ANALYSIS WORKFLOW
                            </span>

                            <strong>
                                Analysis Tool
                                → Bot Editor
                                → Run Bot
                            </strong>

                            <p>
                                Market analysis stays
                                separate from bot
                                configuration.
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        );
    }
);

type ParameterProps = {
    label: string;
    control: React.ReactNode;
};

const Parameter = ({
    label,
    control,
}: ParameterProps) => (
    <div className='bot-editor__parameter'>
        <span>{label}</span>
        {control}
    </div>
);

type SummaryItemProps = {
    label: string;
    value: string;
};

const SummaryItem = ({
    label,
    value,
}: SummaryItemProps) => (
    <div className='bot-editor__summary-item'>
        <span>{label}</span>
        <strong>{value}</strong>
    </div>
);

export default BotEditor;
