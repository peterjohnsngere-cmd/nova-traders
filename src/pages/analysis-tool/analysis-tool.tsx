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

const MARKETS = [
    { symbol: 'R_10', label: 'Volatility 10' },
    { symbol: 'R_25', label: 'Volatility 25' },
    { symbol: 'R_50', label: 'Volatility 50' },
    { symbol: 'R_75', label: 'Volatility 75' },
    { symbol: 'R_100', label: 'Volatility 100' },
    { symbol: '1HZ10V', label: 'Volatility 10 (1s)' },
    { symbol: '1HZ25V', label: 'Volatility 25 (1s)' },
    { symbol: '1HZ50V', label: 'Volatility 50 (1s)' },
    { symbol: '1HZ75V', label: 'Volatility 75 (1s)' },
    { symbol: '1HZ100V', label: 'Volatility 100 (1s)' },
];

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const SEQUENCE_LENGTH = 36;

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
    const [market, setMarket] = useState('R_100');
    const [ticks, setTicks] = useState<Tick[]>([]);
    const [activeMode, setActiveMode] =
        useState<AnalysisMode | null>(null);

    const [selectedBarrier, setSelectedBarrier] =
        useState(5);

    const [selectedMatchDigit, setSelectedMatchDigit] =
        useState(0);

    const ticksServiceRef = useRef<any>(null);
    const monitorKeyRef = useRef<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const startTicks = async () => {
            try {
                if (!ticksServiceRef.current) {
                    ticksServiceRef.current = new TicksService();
                }

                const service = ticksServiceRef.current;

                if (monitorKeyRef.current) {
                    try {
                        await service.stopMonitor({
                            symbol: market,
                            granularity: undefined,
                            key: monitorKeyRef.current,
                        });
                    } catch {}

                    monitorKeyRef.current = null;
                }

                setTicks([]);

                const key = await service.monitor({
                    symbol: market,
                    granularity: false,

                    callback: (newTicks: Tick[]) => {
                        if (!mounted) return;

                        const safeTicks = Array.isArray(newTicks)
                            ? newTicks
                                  .filter(
                                      tick =>
                                          tick &&
                                          typeof tick.epoch === 'number' &&
                                          typeof tick.quote === 'number'
                                  )
                                  .slice(-1000)
                            : [];

                        setTicks(safeTicks);
                    },
                });

                if (mounted) {
                    monitorKeyRef.current = key;
                }
            } catch (error) {
                console.error(
                    'Analysis Tool tick error:',
                    error
                );
            }
        };

        startTicks();

        return () => {
            mounted = false;

            if (
                ticksServiceRef.current &&
                monitorKeyRef.current
            ) {
                ticksServiceRef.current
                    .stopMonitor({
                        symbol: market,
                        granularity: undefined,
                        key: monitorKeyRef.current,
                    })
                    .catch(() => {});

                monitorKeyRef.current = null;
            }
        };
    }, [market]);

    const recentTicks = useMemo(
        () => ticks.slice(-100),
        [ticks]
    );

    const currentTick =
        recentTicks[recentTicks.length - 1];

    const currentDigit = currentTick
        ? getLastDigit(currentTick.quote)
        : null;

    /*
     * RISE / FALL
     */
    const riseFallSequence = useMemo(() => {
        const sequence: ('R' | 'F')[] = [];

        for (let i = 1; i < recentTicks.length; i += 1) {
            if (
                recentTicks[i].quote >
                recentTicks[i - 1].quote
            ) {
                sequence.push('R');
            } else if (
                recentTicks[i].quote <
                recentTicks[i - 1].quote
            ) {
                sequence.push('F');
            }
        }

        return sequence.slice(-SEQUENCE_LENGTH);
    }, [recentTicks]);

    const riseFall = useMemo(() => {
        let rise = 0;
        let fall = 0;

        riseFallSequence.forEach(signal => {
            if (signal === 'R') {
                rise += 1;
            } else {
                fall += 1;
            }
        });

        const total = rise + fall;

        return {
            risePercentage: percentage(rise, total),
            fallPercentage: percentage(fall, total),
        };
    }, [riseFallSequence]);

    /*
     * MATCHES / DIFFERS
     *
     * Selected digit is used as the match target.
     */
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

        const total = matches + differs;

        return {
            matchesPercentage: percentage(matches, total),
            differsPercentage: percentage(differs, total),
        };
    }, [recentTicks, selectedMatchDigit]);

    /*
     * OVER / UNDER
     *
     * Selected digit is the barrier.
     */
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

    /*
     * DIGIT PERCENTAGES
     */
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

    /*
     * EVEN / ODD
     */
    const evenOddSequence = useMemo(() => {
        return recentTicks
            .map(tick => {
                const digit = getLastDigit(tick.quote);

                return digit % 2 === 0 ? 'E' : 'O';
            })
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

    const activeTitle =
        options.find(
            option => option.id === activeMode
        )?.title || '';

    return (
        <div className="analysis-tool">
            <div className="analysis-tool__workspace">

                <div className="analysis-tool__topbar">

                    <div>
                        <h1>Analysis Tool</h1>

                        <span>
                            Live Deriv market analysis
                        </span>
                    </div>

                    <select
                        value={market}
                        onChange={event =>
                            setMarket(event.target.value)
                        }
                    >
                        {MARKETS.map(item => (
                            <option
                                key={item.symbol}
                                value={item.symbol}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>

                </div>

                <div className="analysis-tool__stats">

                    <div className="analysis-stat">
                        <span>LIVE PRICE</span>

                        <strong>
                            {currentTick
                                ? currentTick.quote.toFixed(2)
                                : '...'}
                        </strong>
                    </div>

                    <div className="analysis-stat">
                        <span>LAST DIGIT</span>

                        <strong>
                            {currentDigit ?? '-'}
                        </strong>
                    </div>

                    <div className="analysis-stat">
                        <span>LIVE TICKS</span>

                        <strong>
                            {recentTicks.length}
                        </strong>
                    </div>

                    <div className="analysis-stat">
                        <span>MARKET</span>

                        <strong>{market}</strong>
                    </div>

                </div>

                {!activeMode && (
                    <section className="analysis-section analysis-selector">

                        <div className="analysis-section__heading">

                            <div>
                                <h2>Choose Analysis</h2>

                                <span>
                                    Select what you want to analyse
                                </span>
                            </div>

                        </div>

                        <div className="analysis-options">

                            {options.map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className="analysis-option"
                                    onClick={() =>
                                        setActiveMode(
                                            option.id
                                        )
                                    }
                                >
                                    <span className="analysis-option__icon">
                                        {option.icon}
                                    </span>

                                    <span className="analysis-option__text">

                                        <strong>
                                            {option.title}
                                        </strong>

                                        <small>
                                            {option.subtitle}
                                        </small>

                                    </span>

                                    <span className="analysis-option__arrow">
                                        →
                                    </span>

                                </button>
                            ))}

                        </div>

                    </section>
                )}

                {activeMode && (
                    <section className="analysis-section analysis-active-panel">

                        <div className="analysis-section__heading">

                            <div>

                                <h2>{activeTitle}</h2>

                                <span>
                                    {market} • Live analysis
                                </span>

                            </div>

                            <button
                                type="button"
                                className="analysis-close"
                                onClick={() =>
                                    setActiveMode(null)
                                }
                            >
                                ← BACK
                            </button>

                        </div>

                        {/* RISE / FALL */}

                        {activeMode === 'rise-fall' && (
                            <>

                                <div className="analysis-bars">

                                    <div className="analysis-bar-row">

                                        <div
                                            className={`analysis-bar-signal ${
                                                riseFall.risePercentage >=
                                                riseFall.fallPercentage
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >
                                            R
                                        </div>

                                        <div className="analysis-bar-label">
                                            RISE
                                        </div>

                                        <div className="analysis-bar-track">

                                            <div
                                                className="analysis-bar-fill"
                                                style={{
                                                    width: `${riseFall.risePercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <div className="analysis-bar-percent">
                                            {riseFall.risePercentage}%
                                        </div>

                                    </div>

                                    <div className="analysis-bar-row">

                                        <div
                                            className={`analysis-bar-signal ${
                                                riseFall.fallPercentage >
                                                riseFall.risePercentage
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >
                                            F
                                        </div>

                                        <div className="analysis-bar-label">
                                            FALL
                                        </div>

                                        <div className="analysis-bar-track">

                                            <div
                                                className="analysis-bar-fill"
                                                style={{
                                                    width: `${riseFall.fallPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <div className="analysis-bar-percent">
                                            {riseFall.fallPercentage}%
                                        </div>

                                    </div>

                                </div>

                                <div className="analysis-sequence-panel">

                                    <div className="sequence-heading">

                                        <span>
                                            RECENT RISE / FALL
                                        </span>

                                        <strong>
                                            LAST {SEQUENCE_LENGTH}
                                        </strong>

                                    </div>

                                    <div className="sequence-row sequence-row--signals">

                                        {riseFallSequence.map(
                                            (signal, index) => (
                                                <span
                                                    key={`${signal}-${index}`}
                                                    className={
                                                        signal === 'R'
                                                            ? 'sequence-r'
                                                            : 'sequence-f'
                                                    }
                                                >
                                                    {signal}
                                                </span>
                                            )
                                        )}

                                    </div>

                                    <div className="sequence-newest">
                                        NEWEST →
                                    </div>

                                </div>

                            </>
                        )}

                        {/* MATCHES / DIFFERS */}

                        {activeMode === 'matches-differs' && (
                            <>

                                <div className="analysis-digit-selector">

                                    {DIGITS.map(digit => (
                                        <button
                                            key={digit}
                                            type="button"
                                            className={
                                                selectedMatchDigit === digit
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

                                    Selected digit:{' '}

                                    <strong>
                                        {selectedMatchDigit}
                                    </strong>

                                </div>

                                <div className="analysis-line-layout">

                                    <div className="analysis-percentage-line">

                                        <span className="analysis-line-title">
                                            MATCHES
                                        </span>

                                        <div className="analysis-line-track">

                                            <div
                                                className="analysis-line-fill"
                                                style={{
                                                    width: `${matchesDiffers.matchesPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <strong>
                                            {matchesDiffers.matchesPercentage}%
                                        </strong>

                                    </div>

                                    <div className="analysis-percentage-line">

                                        <span className="analysis-line-title">
                                            DIFFERS
                                        </span>

                                        <div className="analysis-line-track">

                                            <div
                                                className="analysis-line-fill"
                                                style={{
                                                    width: `${matchesDiffers.differsPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <strong>
                                            {matchesDiffers.differsPercentage}%
                                        </strong>

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

                        {/* OVER / UNDER */}

                        {activeMode === 'over-under' && (
                            <>

                                <div className="analysis-digit-selector">

                                    {DIGITS.map(digit => (
                                        <button
                                            key={digit}
                                            type="button"
                                            className={
                                                selectedBarrier === digit
                                                    ? 'active'
                                                    : ''
                                            }
                                            onClick={() =>
                                                setSelectedBarrier(
                                                    digit
                                                )
                                            }
                                        >
                                            {digit}
                                        </button>
                                    ))}

                                </div>

                                <div className="analysis-barrier-label">

                                    Selected barrier:{' '}

                                    <strong>
                                        {selectedBarrier}
                                    </strong>

                                </div>

                                <div className="analysis-line-layout">

                                    <div className="analysis-percentage-line">

                                        <span className="analysis-line-title">
                                            OVER {selectedBarrier}
                                        </span>

                                        <div className="analysis-line-track">

                                            <div
                                                className="analysis-line-fill"
                                                style={{
                                                    width: `${overUnder.overPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <strong>
                                            {overUnder.overPercentage}%
                                        </strong>

                                    </div>

                                    <div className="analysis-percentage-line">

                                        <span className="analysis-line-title">
                                            UNDER {selectedBarrier}
                                        </span>

                                        <div className="analysis-line-track">

                                            <div
                                                className="analysis-line-fill"
                                                style={{
                                                    width: `${overUnder.underPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <strong>
                                            {overUnder.underPercentage}%
                                        </strong>

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

                        {/* EVEN / ODD */}

                        {activeMode === 'even-odd' && (
                            <>

                                <div className="analysis-bars">

                                    <div className="analysis-bar-row">

                                        <div
                                            className={`analysis-bar-signal ${
                                                evenOdd.evenPercentage >=
                                                evenOdd.oddPercentage
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >
                                            E
                                        </div>

                                        <div className="analysis-bar-label">
                                            EVEN
                                        </div>

                                        <div className="analysis-bar-track">

                                            <div
                                                className="analysis-bar-fill"
                                                style={{
                                                    width: `${evenOdd.evenPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <div className="analysis-bar-percent">
                                            {evenOdd.evenPercentage}%
                                        </div>

                                    </div>

                                    <div className="analysis-bar-row">

                                        <div
                                            className={`analysis-bar-signal ${
                                                evenOdd.oddPercentage >
                                                evenOdd.evenPercentage
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >
                                            O
                                        </div>

                                        <div className="analysis-bar-label">
                                            ODD
                                        </div>

                                        <div className="analysis-bar-track">

                                            <div
                                                className="analysis-bar-fill"
                                                style={{
                                                    width: `${evenOdd.oddPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <div className="analysis-bar-percent">
                                            {evenOdd.oddPercentage}%
                                        </div>

                                    </div>

                                </div>

                                <div className="analysis-sequence-panel">

                                    <div className="sequence-heading">

                                        <span>
                                            RECENT EVEN / ODD
                                        </span>

                                        <strong>
                                            LAST {SEQUENCE_LENGTH}
                                        </strong>

                                    </div>

                                    <div className="sequence-row sequence-row--signals">

                                        {evenOddSequence.map(
                                            (signal, index) => (
                                                <span
                                                    key={`${signal}-${index}`}
                                                    className={
                                                        signal === 'E'
                                                            ? 'sequence-e'
                                                            : 'sequence-o'
                                                    }
                                                >
                                                    {signal}
                                                </span>
                                            )
                                        )}

                                    </div>

                                    <div className="sequence-newest">
                                        NEWEST →
                                    </div>

                                </div>

                            </>
                        )}

                    </section>
                )}

            </div>
        </div>
    );
};

export default AnalysisTool;
