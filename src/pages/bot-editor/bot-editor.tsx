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
};

type TradeCategory = {
    label: string;
    types: string[];
};

const MARKETS = [
    'Derived',
    'Continuous Indices',
    'Forex',
    'Commodities',
    'Cryptocurrencies',
];

const DERIVED_MARKETS = [
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
];

const CONTINUOUS_INDICES = [
    'Boom 300 Index',
    'Boom 500 Index',
    'Boom 1000 Index',
    'Crash 300 Index',
    'Crash 500 Index',
    'Crash 1000 Index',
];

const FOREX_MARKETS = [
    'EUR/USD',
    'GBP/USD',
    'USD/JPY',
    'AUD/USD',
    'USD/CAD',
    'USD/CHF',
    'EUR/GBP',
];

const COMMODITY_MARKETS = [
    'Gold',
    'Silver',
    'US Oil',
    'UK Oil',
];

const CRYPTO_MARKETS = [
    'BTC/USD',
    'ETH/USD',
    'LTC/USD',
];

const TRADE_CATEGORIES: TradeCategory[] = [
    {
        label: 'Up / Down',
        types: [
            'Rise / Fall',
            'Higher / Lower',
            'Touch / No Touch',
        ],
    },
    {
        label: 'Digits',
        types: [
            'Even / Odd',
            'Matches / Differs',
            'Over / Under',
        ],
    },
    {
        label: 'In / Out',
        types: [
            'Ends In / Ends Out',
            'Stays In / Goes Out',
        ],
    },
    {
        label: 'Asian',
        types: [
            'Asian Up',
            'Asian Down',
        ],
    },
    {
        label: 'Accumulators',
        types: [
            'Accumulators',
        ],
    },
];

const BOT_CONFIGS: Record<string, BotConfig> = {
    pulse: {
        name: 'Pulse Bot',
        description:
            'A selective digit-based bot configured for Even/Odd trading.',
        quickStrategy:
            'Even / Odd',
    },

    volt: {
        name: 'Volt Bot',
        description:
            'A fast digit-based bot configured for Over/Under trading.',
        quickStrategy:
            'Over / Under',
    },

    cipher: {
        name: 'Cipher Bot',
        description:
            'A configurable pattern-based trading bot.',
        quickStrategy:
            'Pattern Strategy',
    },

    vector: {
        name: 'Vector Bot',
        description:
            'A directional trading bot for movement-based contracts.',
        quickStrategy:
            'Directional Strategy',
    },

    nexus: {
        name: 'Nexus Bot',
        description:
            'A multi-condition bot for confirmed trading setups.',
        quickStrategy:
            'Multi-Condition Strategy',
    },

    prime: {
        name: 'Prime Bot',
        description:
            'A number-focused bot for selective digit contracts.',
        quickStrategy:
            'Digit Strategy',
    },

    orbit: {
        name: 'Orbit Bot',
        description:
            'A dedicated bot with its own configurable trading workflow.',
        quickStrategy:
            'Orbit Strategy',
    },
};

const getMarketsForCategory = (
    category: string
) => {
    switch (category) {
        case 'Derived':
            return DERIVED_MARKETS;

        case 'Continuous Indices':
            return CONTINUOUS_INDICES;

        case 'Forex':
            return FOREX_MARKETS;

        case 'Commodities':
            return COMMODITY_MARKETS;

        case 'Cryptocurrencies':
            return CRYPTO_MARKETS;

        default:
            return [];
    }
};

const getCategoryForTradeType = (
    tradeType: string
) => {
    return TRADE_CATEGORIES.find(category =>
        category.types.includes(tradeType)
    );
};

const BotEditor = observer(
    ({
        selectedBotId = 'pulse',
        selectedBotName,
    }: BotEditorProps) => {
        const botConfig =
            BOT_CONFIGS[selectedBotId] ||
            BOT_CONFIGS.pulse;

        const botName =
            selectedBotName ||
            botConfig.name;

        /*
         * ----------------------------------------
         * BOT STATE
         * ----------------------------------------
         */

        const [marketCategory, setMarketCategory] =
            useState('Derived');

        const [market, setMarket] =
            useState('Volatility 10');

        const [tradeCategory, setTradeCategory] =
            useState('Digits');

        const [tradeType, setTradeType] =
            useState('Even / Odd');

        const [stake, setStake] =
            useState('0.35');

        const [martingale, setMartingale] =
            useState('1.00');

        const [takeProfit, setTakeProfit] =
            useState('10');

        const [stopLoss, setStopLoss] =
            useState('10');

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
         * Bot running state.
         */
        const [isRunning, setIsRunning] =
            useState(false);

        /*
         * Runtime information.
         *
         * These will later be connected to
         * the actual Deriv execution engine.
         */
        const [transactions, setTransactions] =
            useState<string[]>([]);

        const [journal, setJournal] =
            useState<string[]>([]);

        const [profitLoss, setProfitLoss] =
            useState(0);

        const [wins, setWins] =
            useState(0);

        const [losses, setLosses] =
            useState(0);

        /*
         * ----------------------------------------
         * BOT CHANGES
         * ----------------------------------------
         */

        useEffect(() => {
            const defaultCategory =
                botConfig.quickStrategy;

            const matchedCategory =
                TRADE_CATEGORIES.find(category =>
                    category.types.includes(
                        defaultCategory
                    )
                );

            if (matchedCategory) {
                setTradeCategory(
                    matchedCategory.label
                );

                setTradeType(
                    defaultCategory
                );
            }

            setIsRunning(false);
            setTransactions([]);
            setJournal([]);
            setProfitLoss(0);
            setWins(0);
            setLosses(0);
        }, [
            selectedBotId,
            botConfig.quickStrategy,
        ]);

        /*
         * ----------------------------------------
         * MARKET CATEGORY
         * ----------------------------------------
         */

        const availableMarkets = useMemo(
            () =>
                getMarketsForCategory(
                    marketCategory
                ),
            [marketCategory]
        );

        const handleMarketCategoryChange = (
            value: string
        ) => {
            setMarketCategory(value);

            const markets =
                getMarketsForCategory(value);

            if (markets.length > 0) {
                setMarket(markets[0]);
            }
        };

        /*
         * ----------------------------------------
         * TRADE CATEGORY
         * ----------------------------------------
         */

        const handleTradeCategoryChange = (
            value: string
        ) => {
            setTradeCategory(value);

            const category =
                TRADE_CATEGORIES.find(
                    item =>
                        item.label === value
                );

            if (
                category &&
                category.types.length > 0
            ) {
                setTradeType(
                    category.types[0]
                );
            }
        };

        /*
         * ----------------------------------------
         * TRADE TYPE
         * ----------------------------------------
         */

        const handleTradeTypeChange = (
            value: string
        ) => {
            setTradeType(value);

            const category =
                getCategoryForTradeType(
                    value
                );

            if (category) {
                setTradeCategory(
                    category.label
                );
            }
        };

        /*
         * ----------------------------------------
         * RUN BOT
         * ----------------------------------------
         */

        const handleRunBot = () => {
            const stakeValue =
                Number(stake);

            const martingaleValue =
                Number(martingale);

            const takeProfitValue =
                Number(takeProfit);

            const stopLossValue =
                Number(stopLoss);

            if (
                !Number.isFinite(
                    stakeValue
                ) ||
                stakeValue <= 0
            ) {
                window.alert(
                    'Please enter a valid stake.'
                );

                return;
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

                return;
            }

            if (
                !Number.isFinite(
                    takeProfitValue
                ) ||
                takeProfitValue <= 0
            ) {
                window.alert(
                    'Please enter a valid Take Profit.'
                );

                return;
            }

            if (
                !Number.isFinite(
                    stopLossValue
                ) ||
                stopLossValue <= 0
            ) {
                window.alert(
                    'Please enter a valid Stop Loss.'
                );

                return;
            }

            setIsRunning(true);

            setJournal(previous => [
                `Bot started — ${botName}`,
                `Market: ${market}`,
                `Trade type: ${tradeType}`,
                ...previous,
            ]);
        };

        /*
         * ----------------------------------------
         * STOP BOT
         * ----------------------------------------
         */

        const handleStopBot = () => {
            setIsRunning(false);

            setJournal(previous => [
                `Bot stopped — ${botName}`,
                ...previous,
            ]);
        };

        /*
         * ----------------------------------------
         * TRADE PARAMETER UI
         * ----------------------------------------
         */

        const renderTradeParameters = () => {
            switch (tradeType) {
                case 'Rise / Fall':
                    return (
                        <>
                            <div className='bot-editor__parameter'>
                                <span>
                                    CONTRACT
                                </span>

                                <select>
                                    <option>
                                        Rise
                                    </option>

                                    <option>
                                        Fall
                                    </option>
                                </select>
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    DURATION
                                </span>

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
                            </div>
                        </>
                    );

                case 'Higher / Lower':
                    return (
                        <>
                            <div className='bot-editor__parameter'>
                                <span>
                                    PREDICTION
                                </span>

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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    DURATION
                                </span>

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
                            </div>
                        </>
                    );

                case 'Touch / No Touch':
                    return (
                        <>
                            <div className='bot-editor__parameter'>
                                <span>
                                    CONTRACT
                                </span>

                                <select>
                                    <option>
                                        Touch
                                    </option>

                                    <option>
                                        No Touch
                                    </option>
                                </select>
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    BARRIER
                                </span>

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
                            </div>
                        </>
                    );

                case 'Even / Odd':
                    return (
                        <div className='bot-editor__parameter'>
                            <span>
                                CONTRACT
                            </span>

                            <select>
                                <option>
                                    Even
                                </option>

                                <option>
                                    Odd
                                </option>
                            </select>
                        </div>
                    );

                case 'Matches / Differs':
                    return (
                        <>
                            <div className='bot-editor__parameter'>
                                <span>
                                    CONTRACT
                                </span>

                                <select>
                                    <option>
                                        Matches
                                    </option>

                                    <option>
                                        Differs
                                    </option>
                                </select>
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    DIGIT
                                </span>

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
                                        (
                                            _,
                                            index
                                        ) => (
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
                            </div>
                        </>
                    );

                case 'Over / Under':
                    return (
                        <>
                            <div className='bot-editor__parameter'>
                                <span>
                                    CONTRACT
                                </span>

                                <select>
                                    <option>
                                        Over
                                    </option>

                                    <option>
                                        Under
                                    </option>
                                </select>
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    BARRIER
                                </span>

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
                                        (
                                            _,
                                            index
                                        ) => (
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
                            </div>
                        </>
                    );

                case 'Ends In / Ends Out':
                    return (
                        <>
                            <div className='bot-editor__parameter'>
                                <span>
                                    CONTRACT
                                </span>

                                <select>
                                    <option>
                                        Ends In
                                    </option>

                                    <option>
                                        Ends Out
                                    </option>
                                </select>
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    RANGE LOW
                                </span>

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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    RANGE HIGH
                                </span>

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
                            </div>
                        </>
                    );

                case 'Stays In / Goes Out':
                    return (
                        <>
                            <div className='bot-editor__parameter'>
                                <span>
                                    CONTRACT
                                </span>

                                <select>
                                    <option>
                                        Stays In
                                    </option>

                                    <option>
                                        Goes Out
                                    </option>
                                </select>
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    RANGE LOW
                                </span>

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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    RANGE HIGH
                                </span>

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
                            </div>
                        </>
                    );

                case 'Asian Up':
                case 'Asian Down':
                    return (
                        <div className='bot-editor__parameter'>
                            <span>
                                DURATION
                            </span>

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
                        </div>
                    );

                case 'Accumulators':
                    return (
                        <>
                            <div className='bot-editor__parameter'>
                                <span>
                                    GROWTH
                                    PERCENTAGE
                                </span>

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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    DURATION
                                </span>

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
                            </div>
                        </>
                    );

                default:
                    return null;
            }
        };

        return (
            <div className='bot-editor'>
                {/* =====================================
                    HEADER
                ====================================== */}

                <div className='bot-editor__header'>
                    <div>
                        <div className='bot-editor__eyebrow'>
                            BOT EDITOR
                        </div>

                        <h1>
                            {botName}
                        </h1>

                        <p>
                            {
                                botConfig.description
                            }
                        </p>
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
                </div>

                {/* =====================================
                    QUICK STRATEGY
                ====================================== */}

                <section className='bot-editor__section bot-editor__quick-strategy'>
                    <div className='bot-editor__section-title'>
                        <div>
                            <span>
                                ⚡ QUICK STRATEGY
                            </span>

                            <p>
                                Choose the
                                predefined
                                strategy for this
                                bot.
                            </p>
                        </div>
                    </div>

                    <div className='bot-editor__quick-card'>
                        <strong>
                            {
                                botConfig.quickStrategy
                            }
                        </strong>

                        <span>
                            Active strategy
                        </span>
                    </div>
                </section>

                {/* =====================================
                    TRADE PARAMETERS
                ====================================== */}

                <section className='bot-editor__section'>
                    <div className='bot-editor__section-title'>
                        <div>
                            <span>
                                ⚙️ TRADE PARAMETERS
                            </span>

                            <p>
                                Configure the
                                contract this bot
                                will trade.
                            </p>
                        </div>
                    </div>

                    {/* MARKET */}
                    <div className='bot-editor__group'>
                        <div className='bot-editor__group-title'>
                            <span>
                                MARKET
                            </span>
                        </div>

                        <div className='bot-editor__grid'>
                            <div className='bot-editor__parameter'>
                                <span>
                                    MARKET CATEGORY
                                </span>

                                <select
                                    value={
                                        marketCategory
                                    }
                                    onChange={event =>
                                        handleMarketCategoryChange(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >
                                    {MARKETS.map(
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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    MARKET
                                </span>

                                <select
                                    value={
                                        market
                                    }
                                    onChange={event =>
                                        setMarket(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >
                                    {availableMarkets.map(
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
                            </div>
                        </div>
                    </div>

                    {/* TRADE TYPE */}
                    <div className='bot-editor__group'>
                        <div className='bot-editor__group-title'>
                            <span>
                                TRADE TYPE
                            </span>
                        </div>

                        <div className='bot-editor__trade-type-layout'>
                            <div className='bot-editor__trade-categories'>
                                {TRADE_CATEGORIES.map(
                                    category => (
                                        <button
                                            key={
                                                category.label
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
                                                    category.label
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
                                {(
                                    TRADE_CATEGORIES.find(
                                        category =>
                                            category.label ===
                                            tradeCategory
                                    )?.types ||
                                    []
                                ).map(
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
                        <div className='bot-editor__group-title'>
                            <span>
                                CONTRACT PARAMETERS
                            </span>
                        </div>

                        <div className='bot-editor__grid'>
                            {renderTradeParameters()}
                        </div>
                    </div>

                    {/* MONEY MANAGEMENT */}
                    <div className='bot-editor__group'>
                        <div className='bot-editor__group-title'>
                            <span>
                                MONEY MANAGEMENT
                            </span>
                        </div>

                        <div className='bot-editor__grid'>
                            <div className='bot-editor__parameter'>
                                <span>
                                    STAKE
                                </span>

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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    MARTINGALE
                                </span>

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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    TAKE PROFIT
                                </span>

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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    STOP LOSS
                                </span>

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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    DURATION
                                </span>

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
                            </div>

                            <div className='bot-editor__parameter'>
                                <span>
                                    DURATION UNIT
                                </span>

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
                            </div>
                        </div>
                    </div>
                </section>

                {/* =====================================
                    RUN AREA
                ====================================== */}

                <section className='bot-editor__run-area'>
                    <div className='bot-editor__run-info'>
                        <span>
                            {isRunning
                                ? '↑ BOT IS RUNNING'
                                : 'BOT READY'}
                        </span>

                        <p>
                            {isRunning
                                ? `${botName} is active with the selected trading parameters.`
                                : 'Review your parameters before starting the bot.'}
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

                {/* =====================================
                    RUNNING INFORMATION
                ====================================== */}

                <section className='bot-editor__runtime'>
                    <div className='bot-editor__runtime-header'>
                        <div>
                            <span>
                                BOT ACTIVITY
                            </span>

                            <h2>
                                {botName}
                            </h2>
                        </div>

                        <div
                            className={`bot-editor__runtime-indicator ${
                                isRunning
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <span />

                            {isRunning
                                ? 'RUNNING'
                                : 'STOPPED'}
                        </div>
                    </div>

                    {/* SUMMARY */}
                    <div className='bot-editor__runtime-panel'>
                        <div className='bot-editor__panel-heading'>
                            <strong>
                                SUMMARY
                            </strong>
                        </div>

                        <div className='bot-editor__summary-grid'>
                            <div>
                                <span>
                                    PROFIT / LOSS
                                </span>

                                <strong
                                    className={
                                        profitLoss >=
                                        0
                                            ? 'positive'
                                            : 'negative'
                                    }
                                >
                                    {profitLoss >=
                                    0
                                        ? '+'
                                        : ''}
                                    $
                                    {profitLoss.toFixed(
                                        2
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    TRADES
                                </span>

                                <strong>
                                    {
                                        transactions.length
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    WINS
                                </span>

                                <strong>
                                    {wins}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    LOSSES
                                </span>

                                <strong>
                                    {losses}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* TRANSACTIONS */}
                    <div className='bot-editor__runtime-panel'>
                        <div className='bot-editor__panel-heading'>
                            <strong>
                                TRANSACTIONS
                            </strong>
                        </div>

                        {transactions.length ===
                        0 ? (
                            <div className='bot-editor__empty'>
                                No transactions yet.
                            </div>
                        ) : (
                            <div className='bot-editor__journal-list'>
                                {transactions.map(
                                    (
                                        transaction,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                `${transaction}-${index}`
                                            }
                                        >
                                            {
                                                transaction
                                            }
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* JOURNAL */}
                    <div className='bot-editor__runtime-panel'>
                        <div className='bot-editor__panel-heading'>
                            <strong>
                                JOURNAL
                            </strong>
                        </div>

                        {journal.length ===
                        0 ? (
                            <div className='bot-editor__empty'>
                                Bot activity will
                                appear here.
                            </div>
                        ) : (
                            <div className='bot-editor__journal-list'>
                                {journal.map(
                                    (
                                        entry,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                `${entry}-${index}`
                                            }
                                        >
                                            {entry}
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        );
    }
);

export default BotEditor;
