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
    const [activeMode, setActiveMode] = useState<AnalysisMode | null>(null);

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
                console.error('Analysis Tool tick error:', error);
            }
        };

        startTicks();

        return () => {
            mounted = false;

            if (ticksServiceRef.current && monitorKeyRef.current) {
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

    const recentTicks = useMemo(() => ticks.slice(-100), [ticks]);

    const currentTick = recentTicks[recentTicks.length - 1];

    const currentDigit = currentTick
        ? getLastDigit(currentTick.quote)
        : null;

    /*
     * RISE / FALL
     */
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
            rise,
            fall,
            risePercentage: percentage(rise, total),
            fallPercentage: percentage(fall, total),
        };
    }, [recentTicks]);

    /*
     * OVER / UNDER
     */
    const overUnder = useMemo(() => {
        let over = 0;
        let under = 0;

        recentTicks.forEach(tick => {
            const digit = getLastDigit(tick.quote);

            if (digit >= 5) {
                over += 1;
            } else {
                under += 1;
            }
        });

        return {
            over,
            under,
            overPercentage: percentage(over, recentTicks.length),
            underPercentage: percentage(under, recentTicks.length),
        };
    }, [recentTicks]);

    /*
     * EVEN / ODD
     */
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
            even,
            odd,
            evenPercentage: percentage(even, recentTicks.length),
            oddPercentage: percentage(odd, recentTicks.length),
        };
    }, [recentTicks]);

    /*
     * RECENT SEQUENCE
     */
    const recentSequence = useMemo(
        () =>
            recentTicks
                .slice(-12)
                .map(tick => getLastDigit(tick.quote)),
        [recentTicks]
    );

    /*
     * EVEN / ODD PATTERN
     */
    const sequenceSignal = useMemo(() => {
        if (recentSequence.length < 3) {
            return null;
        }

        const lastThree = recentSequence.slice(-3);

        const allEven = lastThree.every(
            digit => digit % 2 === 0
        );

        const allOdd = lastThree.every(
            digit => digit % 2 !== 0
        );

        if (allEven) {
            return 'odd';
        }

        if (allOdd) {
            return 'even';
        }

        return null;
    }, [recentSequence]);

    /*
     * MATCHES / DIFFERS
     */
    const matchesDiffers = useMemo(() => {
        let matches = 0;
        let differs = 0;

        for (let i = 1; i < recentTicks.length; i += 1) {
            const current = getLastDigit(recentTicks[i].quote);
            const previous = getLastDigit(
                recentTicks[i - 1].quote
            );

            if (current === previous) {
                matches += 1;
            } else {
                differs += 1;
            }
        }

        const total = matches + differs;

        return {
            matches,
            differs,
            matchesPercentage: percentage(matches, total),
            differsPercentage: percentage(differs, total),
        };
    }, [recentTicks]);

    /*
     * LIVE CHART
     */
    const chartPoints = useMemo(() => {
        const data = recentTicks.slice(-40);

        if (!data.length) {
            return '';
        }

        const min = Math.min(
            ...data.map(tick => tick.quote)
        );

        const max = Math.max(
            ...data.map(tick => tick.quote)
        );

        const range = max - min || 1;

        return data
            .map((tick, index) => {
                const x =
                    data.length === 1
                        ? 0
                        : (index / (data.length - 1)) * 100;

                const y =
                    100 -
                    ((tick.quote - min) / range) * 100;

                return `${x},${y}`;
            })
            .join(' ');
    }, [recentTicks]);

    const analysisOptions = [
        {
            id: 'rise-fall' as AnalysisMode,
            title: 'Rise & Fall',
            description: 'Analyze price movement',
        },
        {
            id: 'matches-differs' as AnalysisMode,
            title: 'Matches & Differs',
            description: 'Analyze repeating digits',
        },
        {
            id: 'over-under' as AnalysisMode,
            title: 'Over & Under',
            description: 'Analyze digit barriers',
        },
        {
            id: 'even-odd' as AnalysisMode,
            title: 'Even & Odd',
            description: 'Analyze parity and sequence',
        },
    ];

    return (
        <div className="analysis-tool">
            <div className="analysis-tool__workspace">

                {/* HEADER */}

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

                {/* LIVE STATS */}

                <div className="analysis-tool__stats">

                    <div className="analysis-stat">
                        <span>LIVE PRICE</span>

                        <strong>
                            {currentTick
                                ? currentTick.quote.toFixed(2)
                                : 'Waiting...'}
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

                        <strong>
                            {market}
                        </strong>
                    </div>

                </div>

                {/* LIVE CHART */}

                <section className="analysis-section">

                    <div className="analysis-section__heading">

                        <div>
                            <h2>Live Chart</h2>

                            <span>
                                Real-time market movement
                            </span>
                        </div>

                        <strong>{market}</strong>

                    </div>

                    <div className="analysis-chart">

                        {chartPoints ? (
                            <svg
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                className="analysis-chart__svg"
                            >
                                <polyline
                                    points={chartPoints}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                            </svg>
                        ) : (
                            <div className="analysis-chart__empty">
                                Waiting for live Deriv ticks...
                            </div>
                        )}

                    </div>

                </section>

                {/* ANALYSIS TYPE SELECTOR */}

                <section className="analysis-section">

                    <div className="analysis-section__heading">

                        <div>
                            <h2>Choose Analysis</h2>

                            <span>
                                Select the market behaviour you want to analyse
                            </span>
                        </div>

                    </div>

                    <div className="analysis-options">

                        {analysisOptions.map(option => (
                            <button
                                type="button"
                                key={option.id}
                                className={
                                    activeMode === option.id
                                        ? 'analysis-option active'
                                        : 'analysis-option'
                                }
                                onClick={() =>
                                    setActiveMode(option.id)
                                }
                            >
                                <span className="analysis-option__title">
                                    {option.title}
                                </span>

                                <span className="analysis-option__description">
                                    {option.description}
                                </span>

                                <span className="analysis-option__arrow">
                                    →
                                </span>
                            </button>
                        ))}

                    </div>

                </section>

                {/* =========================
                    SELECTED ANALYSIS
                   ========================= */}

                {activeMode && (
                    <section className="analysis-section analysis-active-panel">

                        <div className="analysis-section__heading">

                            <div>
                                <h2>
                                    {
                                        analysisOptions.find(
                                            option =>
                                                option.id ===
                                                activeMode
                                        )?.title
                                    }
                                </h2>

                                <span>
                                    Live analysis for {market}
                                </span>
                            </div>

                            <button
                                type="button"
                                className="analysis-close"
                                onClick={() =>
                                    setActiveMode(null)
                                }
                            >
                                CLOSE
                            </button>

                        </div>

                        {/* RISE / FALL */}

                        {activeMode === 'rise-fall' && (
                            <div className="analysis-circle-layout">

                                <div
                                    className={`analysis-main-circle ${
                                        riseFall.risePercentage >=
                                        riseFall.fallPercentage
                                            ? 'current'
                                            : ''
                                    }`}
                                >
                                    <strong>
                                        {riseFall.risePercentage}%
                                    </strong>

                                    <span>RISE</span>
                                </div>

                                <div
                                    className={`analysis-main-circle ${
                                        riseFall.fallPercentage >
                                        riseFall.risePercentage
                                            ? 'current'
                                            : ''
                                    }`}
                                >
                                    <strong>
                                        {riseFall.fallPercentage}%
                                    </strong>

                                    <span>FALL</span>
                                </div>

                            </div>
                        )}

                        {/* MATCHES / DIFFERS */}

                        {activeMode === 'matches-differs' && (
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
                                        }%
                                    </strong>

                                    <span>MATCHES</span>
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
                                        }%
                                    </strong>

                                    <span>DIFFERS</span>
                                </div>

                            </div>
                        )}

                        {/* OVER / UNDER */}

                        {activeMode === 'over-under' && (
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

                                    <span>OVER 5</span>
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

                                    <span>UNDER 5</span>
                                </div>

                            </div>
                        )}

                        {/* EVEN / ODD */}

                        {activeMode === 'even-odd' && (
                            <>

                                <div className="analysis-circle-layout">

                                    <div
                                        className={`analysis-main-circle ${
                                            evenOdd.evenPercentage >=
                                            evenOdd.oddPercentage
                                                ? 'current'
                                                : ''
                                        }`}
                                    >
                                        <strong>
                                            {evenOdd.evenPercentage}%
                                        </strong>

                                        <span>EVEN</span>
                                    </div>

                                    <div
                                        className={`analysis-main-circle ${
                                            evenOdd.oddPercentage >
                                            evenOdd.evenPercentage
                                                ? 'current'
                                                : ''
                                        }`}
                                    >
                                        <strong>
                                            {evenOdd.oddPercentage}%
                                        </strong>

                                        <span>ODD</span>
                                    </div>

                                </div>

                                <div className="analysis-sequence-panel">

                                    <div className="sequence-heading">
                                        <span>
                                            RECENT SEQUENCE
                                        </span>

                                        <strong>
                                            LAST 12
                                        </strong>
                                    </div>

                                    <div className="sequence-row">

                                        {recentSequence.map(
                                            (digit, index) => (
                                                <span
                                                    key={`${digit}-${index}`}
                                                >
                                                    {digit}
                                                </span>
                                            )
                                        )}

                                    </div>

                                </div>

                                {sequenceSignal && (
                                    <div className="sequence-signal">

                                        <span>
                                            PATTERN SIGNAL
                                        </span>

                                        <strong>
                                            {sequenceSignal.toUpperCase()}
                                        </strong>

                                    </div>
                                )}

                            </>
                        )}

                    </section>
                )}

            </div>
        </div>
    );
};

export default AnalysisTool;
