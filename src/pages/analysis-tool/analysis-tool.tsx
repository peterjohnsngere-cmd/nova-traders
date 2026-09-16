import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TicksService } from '@/external/bot-skeleton/services/api';
import './analysis-tool.scss';

type AnalysisMode =
    | 'rise-fall'
    | 'matches-differs'
    | 'over-under'
    | 'even-odd';

type Tick = {
    epoch: number;
    quote: number;
};

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Over & Under now starts at 0
const BARRIERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Matches & Differs also uses 0–9
const MATCHES_BARRIERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const SEQUENCE_LENGTH = 36;

const MARKETS = [
    { symbol: 'R_10', name: 'Volatility 10' },
    { symbol: 'R_25', name: 'Volatility 25' },
    { symbol: 'R_50', name: 'Volatility 50' },
    { symbol: 'R_75', name: 'Volatility 75' },
    { symbol: 'R_100', name: 'Volatility 100' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s)' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s)' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s)' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s)' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s)' },
];

const getLastDigit = (quote: number) => {
    const text = String(quote);
    const decimals = text.split('.')[1] || '';

    if (!decimals.length) {
        return Math.abs(Math.floor(quote)) % 10;
    }

    return Number(decimals[decimals.length - 1]);
};

const percentage = (count: number, total: number) =>
    total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;

const AnalysisTool = () => {
    const [activeMode, setActiveMode] =
        useState<AnalysisMode>('rise-fall');

    const [selectedMarket, setSelectedMarket] =
        useState('R_10');

    const [selectedBarrier, setSelectedBarrier] =
        useState(5);

    const [selectedMatchDigit, setSelectedMatchDigit] =
        useState(5);

    const [ticks, setTicks] = useState<Tick[]>([]);

    const ticksServiceRef = useRef<TicksService | null>(null);

    useEffect(() => {
        let mounted = true;

        const startTicks = async () => {
            try {
                const service = new TicksService();

                ticksServiceRef.current = service;

                const response = await service.subscribe({
                    symbol: selectedMarket,
                });

                if (!mounted) return;

                if (response) {
                    const incomingTick = response as Tick;

                    if (
                        typeof incomingTick.quote === 'number' &&
                        typeof incomingTick.epoch === 'number'
                    ) {
                        setTicks(previous => [
                            ...previous,
                            incomingTick,
                        ].slice(-1000));
                    }
                }
            } catch (error) {
                console.error(
                    'Unable to subscribe to ticks:',
                    error
                );
            }
        };

        startTicks();

        return () => {
            mounted = false;

            try {
                ticksServiceRef.current?.unsubscribe();
            } catch (error) {
                console.error(error);
            }

            ticksServiceRef.current = null;
        };
    }, [selectedMarket]);

    const recentTicks = useMemo(
        () => ticks.slice(-100),
        [ticks]
    );

    const currentTick =
        recentTicks[recentTicks.length - 1];

    const currentDigit = currentTick
        ? getLastDigit(currentTick.quote)
        : null;

    const riseFall = useMemo(() => {
        let rise = 0;
        let fall = 0;

        for (let i = 1; i < recentTicks.length; i += 1) {
            const previous = recentTicks[i - 1].quote;
            const current = recentTicks[i].quote;

            if (current > previous) {
                rise += 1;
            } else if (current < previous) {
                fall += 1;
            }
        }

        const total = rise + fall;

        return {
            risePercentage: percentage(rise, total),
            fallPercentage: percentage(fall, total),
        };
    }, [recentTicks]);

    const riseFallSequence = useMemo(() => {
        return recentTicks
            .slice(1)
            .map((tick, index) => {
                const previous = recentTicks[index].quote;

                if (tick.quote > previous) {
                    return 'R';
                }

                if (tick.quote < previous) {
                    return 'F';
                }

                return '-';
            })
            .filter(value => value !== '-')
            .slice(-SEQUENCE_LENGTH);
    }, [recentTicks]);

    const evenOdd = useMemo(() => {
        let even = 0;
        let odd = 0;

        recentTicks.forEach(tick => {
            const digit = getLastDigit(tick.quote);

            if (digit % 2 === 0) {
                even += 1;
            } else {
                odd += 1;
            }
        });

        return {
            evenPercentage: percentage(
                even,
                recentTicks.length
            ),
            oddPercentage: percentage(
                odd,
                recentTicks.length
            ),
        };
    }, [recentTicks]);

    const evenOddSequence = useMemo(() => {
        return recentTicks
            .map(tick => {
                const digit = getLastDigit(tick.quote);

                return digit % 2 === 0 ? 'E' : 'O';
            })
            .slice(-SEQUENCE_LENGTH);
    }, [recentTicks]);

    // Matches & Differs based on the selected number
    const matchesDiffers = useMemo(() => {
        let matches = 0;
        let differs = 0;

        recentTicks.forEach(tick => {
            const digit = getLastDigit(tick.quote);

            if (digit === selectedMatchDigit) {
                matches += 1;
            } else {
                differs += 1;
            }
        });

        return {
            matchesPercentage: percentage(
                matches,
                recentTicks.length
            ),
            differsPercentage: percentage(
                differs,
                recentTicks.length
            ),
        };
    }, [recentTicks, selectedMatchDigit]);

    const overUnder = useMemo(() => {
        let over = 0;
        let under = 0;

        recentTicks.forEach(tick => {
            const digit = getLastDigit(tick.quote);

            if (digit > selectedBarrier) {
                over += 1;
            } else {
                under += 1;
            }
        });

        return {
            overPercentage: percentage(
                over,
                recentTicks.length
            ),
            underPercentage: percentage(
                under,
                recentTicks.length
            ),
        };
    }, [recentTicks, selectedBarrier]);

    const digitPercentages = useMemo(() => {
        const counts: Record<number, number> = {
            0: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            7: 0,
            8: 0,
            9: 0,
        };

        recentTicks.forEach(tick => {
            const digit = getLastDigit(tick.quote);

            counts[digit] += 1;
        });

        return DIGITS.map(digit => ({
            digit,
            percentage: percentage(
                counts[digit],
                recentTicks.length
            ),
        }));
    }, [recentTicks]);

    const options = [
        {
            id: 'rise-fall' as AnalysisMode,
            title: 'Rise & Fall',
            subtitle: 'Price direction',
            icon: '↕',
        },
        {
            id: 'matches-differs' as AnalysisMode,
            title: 'Matches & Differs',
            subtitle: 'Digit repetition',
            icon: '=',
        },
        {
            id: 'over-under' as AnalysisMode,
            title: 'Over & Under',
            subtitle: 'Digit barrier',
            icon: '⌁',
        },
        {
            id: 'even-odd' as AnalysisMode,
            title: 'Even & Odd',
            subtitle: 'Digit parity',
            icon: '◐',
        },
    ];

    return (
        <div className="analysis-tool">
            <div className="analysis-header">
                <div>
                    <h1>Analysis Tool</h1>
                    <p>Live Deriv market analysis</p>
                </div>

                <div className="analysis-market-select">
                    <select
                        value={selectedMarket}
                        onChange={event =>
                            setSelectedMarket(
                                event.target.value
                            )
                        }
                    >
                        {MARKETS.map(market => (
                            <option
                                key={market.symbol}
                                value={market.symbol}
                            >
                                {market.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="analysis-market-list">
                {MARKETS.map(market => (
                    <button
                        key={market.symbol}
                        type="button"
                        className={
                            selectedMarket === market.symbol
                                ? 'active'
                                : ''
                        }
                        onClick={() =>
                            setSelectedMarket(
                                market.symbol
                            )
                        }
                    >
                        {market.name}
                    </button>
                ))}
            </div>

            <div className="analysis-stats">
                <div className="analysis-stat">
                    <span>LIVE PRICE</span>
                    <strong>
                        {currentTick
                            ? currentTick.quote.toFixed(2)
                            : '--'}
                    </strong>
                </div>

                <div className="analysis-stat">
                    <span>LAST DIGIT</span>
                    <strong>
                        {currentDigit ?? '--'}
                    </strong>
                </div>

                <div className="analysis-stat">
                    <span>LIVE TICKS</span>
                    <strong>
                        {recentTicks.length}
                    </strong>
                </div>
            </div>

            <div className="analysis-options">
                {options.map(option => (
                    <button
                        key={option.id}
                        type="button"
                        className={
                            activeMode === option.id
                                ? 'active'
                                : ''
                        }
                        onClick={() =>
                            setActiveMode(option.id)
                        }
                    >
                        <span className="analysis-option-icon">
                            {option.icon}
                        </span>

                        <span>
                            <strong>{option.title}</strong>
                            <small>{option.subtitle}</small>
                        </span>
                    </button>
                ))}
            </div>

            <div className="analysis-content">
                {activeMode === 'rise-fall' && (
                    <>
                        <div className="analysis-percentage-panel">
                            <div className="analysis-percentage-row">
                                <div className="analysis-signal-circle">
                                    R
                                </div>

                                <strong>RISE</strong>

                                <div className="analysis-progress">
                                    <div
                                        className="analysis-progress-fill"
                                        style={{
                                            width: `${riseFall.risePercentage}%`,
                                        }}
                                    />
                                </div>

                                <span>
                                    {riseFall.risePercentage}%
                                </span>
                            </div>

                            <div className="analysis-percentage-row">
                                <div className="analysis-signal-circle">
                                    F
                                </div>

                                <strong>FALL</strong>

                                <div className="analysis-progress">
                                    <div
                                        className="analysis-progress-fill"
                                        style={{
                                            width: `${riseFall.fallPercentage}%`,
                                        }}
                                    />
                                </div>

                                <span>
                                    {riseFall.fallPercentage}%
                                </span>
                            </div>
                        </div>

                        <div className="analysis-sequence-panel">
                            <div className="analysis-sequence-header">
                                <strong>RECENT RISE / FALL</strong>
                                <span>
                                    LAST {SEQUENCE_LENGTH}
                                </span>
                            </div>

                            <div className="analysis-sequence">
                                {riseFallSequence.map(
                                    (signal, index) => (
                                        <span
                                            key={`${signal}-${index}`}
                                            className={signal}
                                        >
                                            {signal}
                                        </span>
                                    )
                                )}
                            </div>

                            <div className="analysis-sequence-newest">
                                NEWEST →
                            </div>
                        </div>
                    </>
                )}

                {activeMode === 'matches-differs' && (
                    <>
                        <div className="analysis-barrier-options">
                            {MATCHES_BARRIERS.map(digit => (
                                <button
                                    key={digit}
                                    type="button"
                                    className={
                                        selectedMatchDigit ===
                                        digit
                                            ? 'active'
                                            : ''
                                    }
                                    onClick={() =>
                                        setSelectedMatchDigit(
                                            digit
                                        )
                                    }
                                >
                                    {digit}
                                </button>
                            ))}
                        </div>

                        <div className="analysis-barrier-label">
                            Selected number:{' '}
                            <strong>
                                {selectedMatchDigit}
                            </strong>
                        </div>

                        <div className="analysis-circle-layout">
                            <div
                                className={`analysis-main-circle ${
                                    matchesDiffers.matchesPercentage >=
                                    matchesDiffers.differsPercentage
                                        ? 'current'
                                        : ''
                                }`}
                            >
                                <strong>
                                    {
                                        matchesDiffers.matchesPercentage
                                    }
                                    %
                                </strong>

                                <span>
                                    MATCHES {selectedMatchDigit}
                                </span>
                            </div>

                            <div
                                className={`analysis-main-circle ${
                                    matchesDiffers.differsPercentage >
                                    matchesDiffers.matchesPercentage
                                        ? 'current'
                                        : ''
                                }`}
                            >
                                <strong>
                                    {
                                        matchesDiffers.differsPercentage
                                    }
                                    %
                                </strong>

                                <span>
                                    DIFFERS {selectedMatchDigit}
                                </span>
                            </div>
                        </div>

                        <div className="analysis-digit-grid">
                            {digitPercentages.map(item => (
                                <div
                                    key={item.digit}
                                    className={`analysis-digit-circle ${
                                        currentDigit ===
                                        item.digit
                                            ? 'current'
                                            : ''
                                    }`}
                                >
                                    <strong>
                                        {item.percentage}%
                                    </strong>

                                    <span>
                                        {item.digit}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeMode === 'over-under' && (
                    <>
                        <div className="analysis-barrier-options">
                            {BARRIERS.map(barrier => (
                                <button
                                    key={barrier}
                                    type="button"
                                    className={
                                        selectedBarrier ===
                                        barrier
                                            ? 'active'
                                            : ''
                                    }
                                    onClick={() =>
                                        setSelectedBarrier(
                                            barrier
                                        )
                                    }
                                >
                                    {barrier}
                                </button>
                            ))}
                        </div>

                        <div className="analysis-barrier-label">
                            Selected number:{' '}
                            <strong>
                                {selectedBarrier}
                            </strong>
                        </div>

                        <div className="analysis-circle-layout">
                            <div
                                className={`analysis-main-circle ${
                                    overUnder.overPercentage >=
                                    overUnder.underPercentage
                                        ? 'current'
                                        : ''
                                }`}
                            >
                                <strong>
                                    {overUnder.overPercentage}%
                                </strong>

                                <span>
                                    OVER {selectedBarrier}
                                </span>
                            </div>

                            <div
                                className={`analysis-main-circle ${
                                    overUnder.underPercentage >
                                    overUnder.overPercentage
                                        ? 'current'
                                        : ''
                                }`}
                            >
                                <strong>
                                    {overUnder.underPercentage}%
                                </strong>

                                <span>
                                    UNDER {selectedBarrier}
                                </span>
                            </div>
                        </div>

                        <div className="analysis-digit-grid">
                            {digitPercentages.map(item => (
                                <div
                                    key={item.digit}
                                    className={`analysis-digit-circle ${
                                        currentDigit ===
                                        item.digit
                                            ? 'current'
                                            : ''
                                    }`}
                                >
                                    <strong>
                                        {item.percentage}%
                                    </strong>

                                    <span>
                                        {item.digit}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeMode === 'even-odd' && (
                    <>
                        <div className="analysis-percentage-panel">
                            <div className="analysis-percentage-row">
                                <div className="analysis-signal-circle">
                                    E
                                </div>

                                <strong>EVEN</strong>

                                <div className="analysis-progress">
                                    <div
                                        className="analysis-progress-fill"
                                        style={{
                                            width: `${evenOdd.evenPercentage}%`,
                                        }}
                                    />
                                </div>

                                <span>
                                    {evenOdd.evenPercentage}%
                                </span>
                            </div>

                            <div className="analysis-percentage-row">
                                <div className="analysis-signal-circle">
                                    O
                                </div>

                                <strong>ODD</strong>

                                <div className="analysis-progress">
                                    <div
                                        className="analysis-progress-fill"
                                        style={{
                                            width: `${evenOdd.oddPercentage}%`,
                                        }}
                                    />
                                </div>

                                <span>
                                    {evenOdd.oddPercentage}%
                                </span>
                            </div>
                        </div>

                        <div className="analysis-sequence-panel">
                            <div className="analysis-sequence-header">
                                <strong>RECENT EVEN / ODD</strong>
                                <span>
                                    LAST {SEQUENCE_LENGTH}
                                </span>
                            </div>

                            <div className="analysis-sequence">
                                {evenOddSequence.map(
                                    (signal, index) => (
                                        <span
                                            key={`${signal}-${index}`}
                                            className={signal}
                                        >
                                            {signal}
                                        </span>
                                    )
                                )}
                            </div>

                            <div className="analysis-sequence-newest">
                                NEWEST →
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AnalysisTool;
