import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TicksService } from '@/external/bot-skeleton/services/api';
import './analysis-tool.scss';

type Tab = 'analysis' | 'scanner';

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
    const [activeTab, setActiveTab] = useState<Tab>('analysis');
    const [market, setMarket] = useState('R_100');
    const [ticks, setTicks] = useState<Tick[]>([]);
    const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
    const [selectedEO, setSelectedEO] = useState<'even' | 'odd' | null>(null);

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
                    } catch {
                        // Ignore previous monitor cleanup errors.
                    }

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

    const digitStats = useMemo(() => {
        const counts = Array.from({ length: 10 }, () => 0);

        recentTicks.forEach(tick => {
            counts[getLastDigit(tick.quote)] += 1;
        });

        const total = recentTicks.length;

        return counts.map((count, digit) => ({
            digit,
            count,
            percentage: percentage(count, total),
        }));
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
            even,
            odd,
            evenPercentage: percentage(even, recentTicks.length),
            oddPercentage: percentage(odd, recentTicks.length),
        };
    }, [recentTicks]);

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

    const matchesDiffers = useMemo(() => {
        const result = Array.from({ length: 10 }, () => ({
            matches: 0,
            differs: 0,
        }));

        recentTicks.forEach((tick, index) => {
            const digit = getLastDigit(tick.quote);
            const previous = recentTicks[index - 1];

            if (!previous) return;

            const previousDigit = getLastDigit(previous.quote);

            if (digit === previousDigit) {
                result[digit].matches += 1;
            } else {
                result[digit].differs += 1;
            }
        });

        return result;
    }, [recentTicks]);

    const strongestDigits = useMemo(
        () =>
            [...digitStats]
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 3),
        [digitStats]
    );

    const weakestDigits = useMemo(
        () =>
            [...digitStats]
                .sort((a, b) => a.percentage - b.percentage)
                .slice(0, 3),
        [digitStats]
    );

    const recentSequence = useMemo(
        () => recentTicks.slice(-12).map(tick => getLastDigit(tick.quote)),
        [recentTicks]
    );

    const sequenceSignal = useMemo(() => {
        if (recentSequence.length < 3) return null;

        const lastThree = recentSequence.slice(-3);

        const allEven = lastThree.every(
            digit => digit % 2 === 0
        );

        const allOdd = lastThree.every(
            digit => digit % 2 !== 0
        );

        if (allEven) return 'odd';
        if (allOdd) return 'even';

        return null;
    }, [recentSequence]);

    const chartPoints = useMemo(() => {
        const data = recentTicks.slice(-40);

        if (!data.length) return '';

        const min = Math.min(...data.map(tick => tick.quote));
        const max = Math.max(...data.map(tick => tick.quote));
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

    const currentTick =
        recentTicks[recentTicks.length - 1];

    const currentDigit = currentTick
        ? getLastDigit(currentTick.quote)
        : null;

    return (
        <div className="analysis-tool">
            <div className="analysis-tool__nav">
                <button
                    type="button"
                    className={
                        activeTab === 'analysis'
                            ? 'active'
                            : ''
                    }
                    onClick={() => setActiveTab('analysis')}
                >
                    ANALYSIS TOOL
                </button>

                <button
                    type="button"
                    className={
                        activeTab === 'scanner'
                            ? 'active'
                            : ''
                    }
                    onClick={() => setActiveTab('scanner')}
                >
                    SCANNER
                </button>
            </div>

            <div className="analysis-tool__workspace">
                <div className="analysis-tool__topbar">
                    <div>
                        <h1>
                            {activeTab === 'analysis'
                                ? 'Analysis Tool'
                                : 'Scanner'}
                        </h1>

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

                <div className="analysis-tool__live">
                    <div>
                        <span>LIVE PRICE</span>

                        <strong>
                            {currentTick
                                ? currentTick.quote.toFixed(2)
                                : 'Waiting...'}
                        </strong>
                    </div>

                    <div>
                        <span>LAST DIGIT</span>

                        <strong>
                            {currentDigit ?? '-'}
                        </strong>
                    </div>

                    <div>
                        <span>LIVE TICKS</span>

                        <strong>
                            {recentTicks.length}
                        </strong>
                    </div>
                </div>

                {activeTab === 'analysis' ? (
                    <>
                        <section className="analysis-section">
                            <div className="analysis-section__header">
                                <h2>Live Chart</h2>
                                <span>{market}</span>
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

                        <section className="analysis-section">
                            <div className="analysis-section__header">
                                <h2>Last Digit Analysis</h2>
                                <span>0 — 9</span>
                            </div>

                            <div className="analysis-digit-grid">
                                {digitStats.map(item => (
                                    <button
                                        type="button"
                                        key={item.digit}
                                        className={`analysis-digit ${
                                            selectedDigit ===
                                            item.digit
                                                ? 'selected'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            setSelectedDigit(
                                                item.digit
                                            )
                                        }
                                    >
                                        <span>
                                            {item.digit}
                                        </span>

                                        <small>
                                            {item.percentage}%
                                        </small>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="analysis-two-column">
                            <section className="analysis-section">
                                <div className="analysis-section__header">
                                    <h2>Over / Under</h2>
                                </div>

                                <div className="analysis-circle-row">
                                    <div
                                        className={`analysis-big-circle ${
                                            overUnder.overPercentage >=
                                            overUnder.underPercentage
                                                ? 'strong'
                                                : ''
                                        }`}
                                    >
                                        <strong>
                                            {
                                                overUnder.overPercentage
                                            }
                                            %
                                        </strong>

                                        <span>
                                            OVER 5
                                        </span>
                                    </div>

                                    <div
                                        className={`analysis-big-circle ${
                                            overUnder.underPercentage >
                                            overUnder.overPercentage
                                                ? 'strong'
                                                : ''
                                        }`}
                                    >
                                        <strong>
                                            {
                                                overUnder.underPercentage
                                            }
                                            %
                                        </strong>

                                        <span>
                                            UNDER 5
                                        </span>
                                    </div>
                                </div>
                            </section>

                            <section className="analysis-section">
                                <div className="analysis-section__header">
                                    <h2>Even / Odd</h2>
                                </div>

                                <div className="analysis-even-odd">
                                    <div
                                        className={
                                            evenOdd.evenPercentage >=
                                            evenOdd.oddPercentage
                                                ? 'current'
                                                : ''
                                        }
                                    >
                                        <strong>
                                            {
                                                evenOdd.evenPercentage
                                            }
                                            %
                                        </strong>

                                        <span>
                                            EVEN
                                        </span>
                                    </div>

                                    <div
                                        className={
                                            evenOdd.oddPercentage >
                                            evenOdd.evenPercentage
                                                ? 'current'
                                                : ''
                                        }
                                    >
                                        <strong>
                                            {
                                                evenOdd.oddPercentage
                                            }
                                            %
                                        </strong>

                                        <span>
                                            ODD
                                        </span>
                                    </div>
                                </div>

                                <div className="analysis-eo-controls">
                                    <button
                                        type="button"
                                        className={
                                            selectedEO ===
                                            'even'
                                                ? 'selected'
                                                : ''
                                        }
                                        onClick={() =>
                                            setSelectedEO(
                                                'even'
                                            )
                                        }
                                    >
                                        E
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            selectedEO ===
                                            'odd'
                                                ? 'selected'
                                                : ''
                                        }
                                        onClick={() =>
                                            setSelectedEO(
                                                'odd'
                                            )
                                        }
                                    >
                                        O
                                    </button>
                                </div>

                                {sequenceSignal && (
                                    <div className="analysis-sequence-signal">
                                        SIGNAL:{' '}
                                        {sequenceSignal.toUpperCase()}
                                    </div>
                                )}

                                <div className="analysis-recent-sequence">
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
                            </section>
                        </div>

                        <section className="analysis-section">
                            <div className="analysis-section__header">
                                <h2>Matches / Differs</h2>
                            </div>

                            <div className="analysis-digit-grid">
                                {matchesDiffers.map(
                                    (item, digit) => {
                                        const total =
                                            item.matches +
                                            item.differs;

                                        return (
                                            <div
                                                className="analysis-digit"
                                                key={digit}
                                            >
                                                <span>
                                                    {digit}
                                                </span>

                                                <small>
                                                    M{' '}
                                                    {percentage(
                                                        item.matches,
                                                        total
                                                    )}
                                                    %
                                                </small>

                                                <small>
                                                    D{' '}
                                                    {percentage(
                                                        item.differs,
                                                        total
                                                    )}
                                                    %
                                                </small>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </section>
                    </>
                ) : (
                    <section className="analysis-section">
                        <div className="analysis-section__header">
                            <h2>Digit Scanner</h2>

                            <span>
                                Live strongest digits
                            </span>
                        </div>

                        <div className="scanner__strongest">
                            {strongestDigits.map(
                                (item, index) => (
                                    <div
                                        className="scanner__result"
                                        key={item.digit}
                                    >
                                        <span>
                                            #{index + 1}
                                        </span>

                                        <strong>
                                            {item.digit}
                                        </strong>

                                        <small>
                                            {item.percentage}%
                                        </small>
                                    </div>
                                )
                            )}
                        </div>

                        <div className="scanner__divider" />

                        <div className="analysis-section__header">
                            <h2>All Digits</h2>
                        </div>

                        <div className="analysis-digit-grid">
                            {digitStats.map(item => (
                                <button
                                    type="button"
                                    key={item.digit}
                                    className={`analysis-digit ${
                                        selectedDigit ===
                                        item.digit
                                            ? 'selected'
                                            : ''
                                    }`}
                                    onClick={() =>
                                        setSelectedDigit(
                                            item.digit
                                        )
                                    }
                                >
                                    <span>
                                        {item.digit}
                                    </span>

                                    <small>
                                        {item.percentage}%
                                    </small>
                                </button>
                            ))}
                        </div>

                        <div className="scanner__summary">
                            <div>
                                <span>
                                    STRONGEST
                                </span>

                                <strong>
                                    {
                                        strongestDigits[0]
                                            ?.digit ?? '-'
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    WEAKEST
                                </span>

                                <strong>
                                    {
                                        weakestDigits[0]
                                            ?.digit ?? '-'
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    SELECTED
                                </span>

                                <strong>
                                    {selectedDigit ?? '-'}
                                </strong>
                            </div>
                        </div>

                        <div className="scanner__recent">
                            <span>
                                RECENT TICKS
                            </span>

                            <div>
                                {recentSequence.map(
                                    (digit, index) => (
                                        <b
                                            key={`${digit}-${index}`}
                                        >
                                            {digit}
                                        </b>
                                    )
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default AnalysisTool;
