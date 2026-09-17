import React, { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocation, useNavigate } from 'react-router';
import './bot-editor.scss';

import { analysisToolStore } from '@/stores/analysis-tool-store';

const MARKETS = [
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

const MARKET_SYMBOLS: Record<string, string> = {
    'Volatility 10': 'R_10',
    'Volatility 25': 'R_25',
    'Volatility 50': 'R_50',
    'Volatility 75': 'R_75',
    'Volatility 100': 'R_100',
    'Volatility 10 (1s)': '1HZ10V',
    'Volatility 25 (1s)': '1HZ25V',
    'Volatility 50 (1s)': '1HZ50V',
    'Volatility 75 (1s)': '1HZ75V',
    'Volatility 100 (1s)': '1HZ100V',
};

const TICK_OPTIONS = [1, 2, 3, 4, 5];

const CONTRACT_TYPES = [
    'Even / Odd',
    'Over / Under',
    'Matches / Differs',
    'Rise / Fall',
    'Accumulators',
];

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type BotLocationState = {
    botId?: string;
    botName?: string;
};

type BotConfig = {
    name: string;
    description: string;
    strategy: string;
    contractTypes: string[];
    orbit?: boolean;
};

const BOT_CONFIGS: Record<string, BotConfig> = {
    pulse: {
        name: 'Pulse Bot',
        description:
            'Analyzes Even/Odd digit behaviour and waits for defined reversal conditions before entering.',
        strategy: 'Even / Odd Reversal',
        contractTypes: CONTRACT_TYPES,
    },

    volt: {
        name: 'Volt Bot',
        description:
            'Uses Over/Under digit analysis and waits for defined conditions before entering.',
        strategy: 'Over / Under Analysis',
        contractTypes: CONTRACT_TYPES,
    },

    cipher: {
        name: 'Cipher Bot',
        description:
            'Studies recent market data and searches for defined digit and contract patterns.',
        strategy: 'Pattern Strategy',
        contractTypes: CONTRACT_TYPES,
    },

    vector: {
        name: 'Vector Bot',
        description:
            'Uses market movement and directional conditions to identify potential setups.',
        strategy: 'Directional Strategy',
        contractTypes: CONTRACT_TYPES,
    },

    nexus: {
        name: 'Nexus Bot',
        description:
            'Combines multiple analysis conditions before allowing a trade setup.',
        strategy: 'Multi-Condition Strategy',
        contractTypes: CONTRACT_TYPES,
    },

    prime: {
        name: 'Prime Bot',
        description:
            'Studies digit behaviour and selects defined number-based trading setups.',
        strategy: 'Digit Strategy',
        contractTypes: CONTRACT_TYPES,
    },

    orbit: {
        name: 'Orbit Bot',
        description:
            'Uses its own dedicated strategy and trading conditions.',
        strategy: 'Orbit Strategy',
        contractTypes: [],
        orbit: true,
    },
};

const BotEditor = observer(() => {
    const location = useLocation();
    const navigate = useNavigate();

    const botState = location.state as BotLocationState | null;

    const botId = botState?.botId || 'pulse';

    const botConfig =
        BOT_CONFIGS[botId] || BOT_CONFIGS.pulse;

    const botName =
        botState?.botName || botConfig.name;

    const [market, setMarket] = useState(MARKETS[0]);

    const [contractType, setContractType] = useState(
        botConfig.contractTypes[0] || 'Orbit Strategy'
    );

    const [stake, setStake] = useState('0.35');
    const [martingale, setMartingale] = useState('1.00');
    const [takeProfit, setTakeProfit] = useState('10');
    const [stopLoss, setStopLoss] = useState('10');
    const [ticks, setTicks] = useState(1);

    const [barrier, setBarrier] = useState(5);
    const [matchDigit, setMatchDigit] = useState(0);

    const [isRunning, setIsRunning] = useState(false);

    const isOrbit = botConfig.orbit === true;

    /*
     * LIVE ANALYSIS DATA
     *
     * This is now coming directly from the shared
     * Analysis Tool store.
     */
    const currentPrice = analysisToolStore.currentPrice;
    const currentDigit = analysisToolStore.currentDigit;

    const evenPercentage =
        analysisToolStore.evenPercentage;

    const oddPercentage =
        analysisToolStore.oddPercentage;

    const evenOddSequence =
        analysisToolStore.evenOddSequence;

    const overPercentage =
        analysisToolStore.overPercentage;

    const underPercentage =
        analysisToolStore.underPercentage;

    const analysisTicks =
        analysisToolStore.recentTicks.length;

    const strategyDescription = useMemo(() => {
        switch (botId) {
            case 'pulse':
                return 'Watches Even/Odd behaviour and waits for the reversal patterns defined for Pulse.';

            case 'volt':
                return 'Watches Over/Under behaviour around the selected barrier and waits for the defined Volt setup.';

            case 'cipher':
                return 'The Cipher strategy will use live market and digit patterns to determine its entry conditions.';

            case 'vector':
                return 'The Vector strategy will use directional market behaviour to determine its entry conditions.';

            case 'nexus':
                return 'The Nexus strategy will combine multiple analysis conditions before an entry.';

            case 'prime':
                return 'The Prime strategy will use digit behaviour and number-based conditions for its entries.';

            case 'orbit':
                return 'Orbit uses a separate dedicated strategy that will be built independently from the other bots.';

            default:
                return 'Configure this bot before running it.';
        }
    }, [botId]);

    const dominantSide =
        evenPercentage >= oddPercentage
            ? 'EVEN'
            : 'ODD';

    const overUnderSide =
        overPercentage >= underPercentage
            ? 'OVER'
            : 'UNDER';

    const handleMarketChange = (value: string) => {
        setMarket(value);

        const symbol = MARKET_SYMBOLS[value];

        if (symbol) {
            analysisToolStore.setMarket(symbol);
        }
    };

    const handleContractChange = (
        value: string
    ) => {
        setContractType(value);

        if (value === 'Over / Under') {
            analysisToolStore.setSelectedBarrier(
                barrier
            );
        }

        if (value === 'Matches / Differs') {
            analysisToolStore.setSelectedMatchDigit(
                matchDigit
            );
        }
    };

    const handleBarrierChange = (value: number) => {
        setBarrier(value);
        analysisToolStore.setSelectedBarrier(value);
    };

    const handleMatchDigitChange = (
        value: number
    ) => {
        setMatchDigit(value);
        analysisToolStore.setSelectedMatchDigit(value);
    };

    const handleRunBot = () => {
        const stakeValue = Number(stake);
        const martingaleValue = Number(martingale);
        const takeProfitValue = Number(takeProfit);
        const stopLossValue = Number(stopLoss);

        if (
            !Number.isFinite(stakeValue) ||
            stakeValue <= 0
        ) {
            window.alert(
                'Please enter a valid stake.'
            );
            return;
        }

        if (
            !Number.isFinite(martingaleValue) ||
            martingaleValue < 1
        ) {
            window.alert(
                'Martingale must be 1.00 or higher.'
            );
            return;
        }

        if (
            !Number.isFinite(takeProfitValue) ||
            takeProfitValue <= 0
        ) {
            window.alert(
                'Please enter a valid Take Profit.'
            );
            return;
        }

        if (
            !Number.isFinite(stopLossValue) ||
            stopLossValue <= 0
        ) {
            window.alert(
                'Please enter a valid Stop Loss.'
            );
            return;
        }

        setIsRunning(true);

        console.log(
            'Nova Traders Bot Configuration',
            {
                botId,
                botName,
                market,
                contractType,
                barrier:
                    contractType === 'Over / Under'
                        ? barrier
                        : undefined,
                matchDigit:
                    contractType ===
                    'Matches / Differs'
                        ? matchDigit
                        : undefined,
                stake: stakeValue,
                martingale: martingaleValue,
                takeProfit: takeProfitValue,
                stopLoss: stopLossValue,
                ticks,
            }
        );

        window.alert(
            `${botName} is configured and ready to run.\n\n` +
                `Market: ${market}\n` +
                `Contract: ${contractType}\n` +
                `Ticks: ${ticks}`
        );
    };

    const handleStopBot = () => {
        setIsRunning(false);
    };

    return (
        <div className='bot-editor'>
            <div className='bot-editor__header'>
                <button
                    className='bot-editor__back'
                    onClick={() => navigate(-1)}
                    type='button'
                >
                    ← Back to Bots
                </button>

                <div className='bot-editor__title'>
                    <div className='bot-editor__icon'>
                        {botName.charAt(0)}
                    </div>

                    <div>
                        <h1>{botName}</h1>

                        <p>
                            {botConfig.description}
                        </p>
                    </div>
                </div>

                <div
                    className={`bot-editor__status ${
                        isRunning ? 'is-running' : ''
                    }`}
                >
                    <span />
                    {isRunning
                        ? 'RUNNING'
                        : 'READY'}
                </div>
            </div>

            <div className='bot-editor__content'>
                <div className='bot-editor__settings'>
                    <div className='bot-editor__section'>
                        <div className='bot-editor__section-heading'>
                            <h2>Bot Settings</h2>

                            <p>
                                Configure how {botName}{' '}
                                will trade.
                            </p>
                        </div>

                        <div className='bot-editor__fields'>
                            <label className='bot-editor__field'>
                                <span>MARKET</span>

                                <select
                                    value={market}
                                    onChange={event =>
                                        handleMarketChange(
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    {MARKETS.map(item => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {!isOrbit && (
                                <label className='bot-editor__field'>
                                    <span>
                                        CONTRACT TYPE
                                    </span>

                                    <select
                                        value={
                                            contractType
                                        }
                                        onChange={event =>
                                            handleContractChange(
                                                event.target
                                                    .value
                                            )
                                        }
                                    >
                                        {botConfig.contractTypes.map(
                                            type => (
                                                <option
                                                    key={
                                                        type
                                                    }
                                                    value={
                                                        type
                                                    }
                                                >
                                                    {type}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>
                            )}

                            {contractType ===
                                'Over / Under' &&
                                !isOrbit && (
                                    <label className='bot-editor__field'>
                                        <span>
                                            BARRIER
                                        </span>

                                        <select
                                            value={
                                                barrier
                                            }
                                            onChange={event =>
                                                handleBarrierChange(
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }
                                        >
                                            {DIGITS.map(
                                                digit => (
                                                    <option
                                                        key={
                                                            digit
                                                        }
                                                        value={
                                                            digit
                                                        }
                                                    >
                                                        {digit}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>
                                )}

                            {contractType ===
                                'Matches / Differs' &&
                                !isOrbit && (
                                    <label className='bot-editor__field'>
                                        <span>
                                            MATCH DIGIT
                                        </span>

                                        <select
                                            value={
                                                matchDigit
                                            }
                                            onChange={event =>
                                                handleMatchDigitChange(
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }
                                        >
                                            {DIGITS.map(
                                                digit => (
                                                    <option
                                                        key={
                                                            digit
                                                        }
                                                        value={
                                                            digit
                                                        }
                                                    >
                                                        {digit}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>
                                )}

                            <label className='bot-editor__field'>
                                <span>STAKE</span>

                                <input
                                    type='number'
                                    min='0.35'
                                    step='0.01'
                                    value={stake}
                                    onChange={event =>
                                        setStake(
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className='bot-editor__field'>
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
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className='bot-editor__field'>
                                <span>
                                    TAKE PROFIT
                                </span>

                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={takeProfit}
                                    onChange={event =>
                                        setTakeProfit(
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className='bot-editor__field'>
                                <span>STOP LOSS</span>

                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={stopLoss}
                                    onChange={event =>
                                        setStopLoss(
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className='bot-editor__field'>
                                <span>TICKS</span>

                                <select
                                    value={ticks}
                                    onChange={event =>
                                        setTicks(
                                            Number(
                                                event
                                                    .target
                                                    .value
                                            )
                                        )
                                    }
                                >
                                    {TICK_OPTIONS.map(
                                        tick => (
                                            <option
                                                key={
                                                    tick
                                                }
                                                value={
                                                    tick
                                                }
                                            >
                                                {tick}{' '}
                                                {tick ===
                                                1
                                                    ? 'Tick'
                                                    : 'Ticks'}
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className='bot-editor__strategy'>
                        <div>
                            <span>
                                ACTIVE STRATEGY
                            </span>

                            <strong>
                                {botConfig.strategy}
                            </strong>
                        </div>

                        <p>
                            {strategyDescription}
                        </p>
                    </div>

                    {botId === 'pulse' && (
                        <>
                            <div className='bot-editor__strategy'>
                                <div>
                                    <span>
                                        LIVE ANALYSIS
                                    </span>

                                    <strong>
                                        Even / Odd
                                    </strong>
                                </div>

                                <p>
                                    Live ticks:{' '}
                                    {analysisTicks}
                                    <br />
                                    Current digit:{' '}
                                    {currentDigit ??
                                        '-'}
                                    <br />
                                    Live price:{' '}
                                    {currentPrice !==
                                    null
                                        ? currentPrice.toFixed(
                                              2
                                          )
                                        : '...'}
                                </p>
                            </div>

                            <div className='bot-editor__strategy'>
                                <div>
                                    <span>
                                        EVEN / ODD
                                    </span>

                                    <strong>
                                        {dominantSide}{' '}
                                        DOMINANT
                                    </strong>
                                </div>

                                <p>
                                    EVEN:{' '}
                                    {evenPercentage}%
                                    <br />
                                    ODD:{' '}
                                    {oddPercentage}%
                                </p>
                            </div>

                            <div className='bot-editor__strategy'>
                                <div>
                                    <span>
                                        RECENT PATTERN
                                    </span>

                                    <strong>
                                        {evenOddSequence
                                            .slice(
                                                -12
                                            )
                                            .join(
                                                ' '
                                            ) ||
                                            'WAITING FOR TICKS...'}
                                    </strong>
                                </div>

                                <p>
                                    Pulse will use this
                                    live sequence to
                                    detect the defined
                                    reversal patterns.
                                </p>
                            </div>
                        </>
                    )}

                    {botId === 'volt' && (
                        <>
                            <div className='bot-editor__strategy'>
                                <div>
                                    <span>
                                        LIVE ANALYSIS
                                    </span>

                                    <strong>
                                        Over / Under
                                    </strong>
                                </div>

                                <p>
                                    Live ticks:{' '}
                                    {analysisTicks}
                                    <br />
                                    Current digit:{' '}
                                    {currentDigit ??
                                        '-'}
                                    <br />
                                    Live price:{' '}
                                    {currentPrice !==
                                    null
                                        ? currentPrice.toFixed(
                                              2
                                          )
                                        : '...'}
                                </p>
                            </div>

                            <div className='bot-editor__strategy'>
                                <div>
                                    <span>
                                        OVER / UNDER
                                    </span>

                                    <strong>
                                        {overUnderSide}{' '}
                                        DOMINANT
                                    </strong>
                                </div>

                                <p>
                                    OVER {barrier}:{' '}
                                    {
                                        overPercentage
                                    }
                                    %
                                    <br />
                                    UNDER {barrier}:{' '}
                                    {
                                        underPercentage
                                    }
                                    %
                                </p>
                            </div>

                            <div className='bot-editor__strategy'>
                                <div>
                                    <span>
                                        VOLT CONDITIONS
                                    </span>

                                    <strong>
                                        Barrier {barrier}
                                    </strong>
                                </div>

                                <p>
                                    Volt is now
                                    connected to the
                                    live Over/Under
                                    analysis. Its actual
                                    entry pattern will
                                    be added next.
                                </p>
                            </div>
                        </>
                    )}

                    {botId !== 'pulse' &&
                        botId !== 'volt' &&
                        isOrbit === false && (
                            <div className='bot-editor__strategy'>
                                <div>
                                    <span>
                                        LIVE ANALYSIS
                                    </span>

                                    <strong>
                                        Connected
                                    </strong>
                                </div>

                                <p>
                                    Live analysis data is
                                    available to this bot.
                                    Its individual
                                    strategy will be
                                    configured separately.
                                </p>
                            </div>
                        )}

                    {isOrbit && (
                        <div className='bot-editor__strategy'>
                            <div>
                                <span>
                                    ORBIT MODE
                                </span>

                                <strong>
                                    Dedicated Strategy
                                </strong>
                            </div>

                            <p>
                                Orbit does not use the
                                shared contract-selection
                                system. Its own strategy
                                will control its trading
                                conditions.
                            </p>
                        </div>
                    )}

                    <div className='bot-editor__actions'>
                        {!isRunning ? (
                            <button
                                className='bot-editor__run'
                                type='button'
                                onClick={handleRunBot}
                            >
                                RUN BOT
                            </button>
                        ) : (
                            <button
                                className='bot-editor__stop'
                                type='button'
                                onClick={handleStopBot}
                            >
                                STOP BOT
                            </button>
                        )}
                    </div>
                </div>

                <aside className='bot-editor__summary'>
                    <div className='bot-editor__summary-header'>
                        <span>BOT SUMMARY</span>

                        <strong>{botName}</strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Market</span>

                        <strong>{market}</strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Contract</span>

                        <strong>
                            {isOrbit
                                ? 'Dedicated Strategy'
                                : contractType}
                        </strong>
                    </div>

                    {!isOrbit &&
                        contractType ===
                            'Over / Under' && (
                            <div className='bot-editor__summary-item'>
                                <span>Barrier</span>

                                <strong>
                                    {barrier}
                                </strong>
                            </div>
                        )}

                    {!isOrbit &&
                        contractType ===
                            'Matches / Differs' && (
                            <div className='bot-editor__summary-item'>
                                <span>Match Digit</span>

                                <strong>
                                    {matchDigit}
                                </strong>
                            </div>
                        )}

                    <div className='bot-editor__summary-item'>
                        <span>Stake</span>

                        <strong>
                            ${stake || '0.00'}
                        </strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Martingale</span>

                        <strong>
                            {martingale}x
                        </strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Take Profit</span>

                        <strong>
                            ${takeProfit || '0.00'}
                        </strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Stop Loss</span>

                        <strong>
                            ${stopLoss || '0.00'}
                        </strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Duration</span>

                        <strong>
                            {ticks}{' '}
                            {ticks === 1
                                ? 'Tick'
                                : 'Ticks'}
                        </strong>
                    </div>
                </aside>
            </div>
        </div>
    );
});

export default BotEditor;
