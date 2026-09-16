import React, { useEffect, useMemo, useState } from 'react';
import './analysis-tool.scss';
import { TicksService } from '@/services/ticks.service';

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

const DIGITS = Array.from({ length: 10 }, (_, i) => i);
const BARRIERS = Array.from({ length: 10 }, (_, i) => i);
const MATCHES_BARRIERS = Array.from({ length: 10 }, (_, i) => i);

const SEQUENCE_LENGTH = 36;

const getLastDigit = (price: number) => {
    const fixed = price.toFixed(2);
    return Number(fixed.charAt(fixed.length - 1));
};

const percentage = (value: number, total: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
};

const AnalysisTool = () => {
    const [market, setMarket] = useState('R_100');
    const [ticks, setTicks] = useState<number[]>([]);
    const [activeMode, setActiveMode] = useState('rise-fall');
    const [selectedBarrier, setSelectedBarrier] = useState(5);
    const [selectedMatchDigit, setSelectedMatchDigit] = useState(5);

    useEffect(() => {
        let mounted = true;

        const service = new TicksService();

        const start = async () => {
            try {
                await service.subscribe(market, (tick: any) => {
                    if (!mounted) return;

                    const price = Number(
                        tick?.quote ??
                        tick?.price ??
                        tick?.tick ??
                        tick
                    );

                    if (!Number.isFinite(price)) return;

                    setTicks((previous) => {
                        const next = [...previous, price];
                        return next.slice(-500);
                    });
                });
            } catch (error) {
                console.error('Analysis Tool tick error:', error);
            }
        };

        setTicks([]);
        start();

        return () => {
            mounted = false;

            try {
                service.unsubscribe?.();
            } catch {
                // Ignore unsubscribe errors.
            }
        };
    }, [market]);

    const recentTicks = useMemo(() => ticks.slice(-100), [ticks]);

    const currentTick = recentTicks[recentTicks.length - 1] ?? 0;
    const currentDigit = getLastDigit(currentTick);

    const riseFallSequence = useMemo(() => {
        const sequence: string[] = [];

        for (let i = 1; i < recentTicks.length; i++) {
            if (recentTicks[i] > recentTicks[i - 1]) {
                sequence.push('R');
            } else if (recentTicks[i] < recentTicks[i - 1]) {
                sequence.push('F');
            }
        }

        return sequence.slice(-SEQUENCE_LENGTH);
    }, [recentTicks]);

    const riseCount = riseFallSequence.filter((item) => item === 'R').length;
    const fallCount = riseFallSequence.filter((item) => item === 'F').length;

    const risePercentage = percentage(
        riseCount,
        riseCount + fallCount
    );

    const fallPercentage = percentage(
        fallCount,
        riseCount + fallCount
    );

    const digitCounts = useMemo(() => {
        const counts = Array(10).fill(0);

        recentTicks.forEach((tick) => {
            counts[getLastDigit(tick)]++;
        });

        return counts;
    }, [recentTicks]);

    const digitPercentages = digitCounts.map((count) =>
        percentage(count, recentTicks.length)
    );

    const matchesCount = digitCounts[selectedMatchDigit] ?? 0;
    const differsCount = Math.max(
        recentTicks.length - matchesCount,
        0
    );

    const matchesPercentage = percentage(
        matchesCount,
        matchesCount + differsCount
    );

    const differsPercentage = percentage(
        differsCount,
        matchesCount + differsCount
    );

    const overCount = digitCounts
        .slice(selectedBarrier + 1)
        .reduce((sum, value) => sum + value, 0);

    const underCount = digitCounts
        .slice(0, selectedBarrier)
        .reduce((sum, value) => sum + value, 0);

    const overPercentage = percentage(
        overCount,
        overCount + underCount
    );

    const underPercentage = percentage(
        underCount,
        overCount + underCount
    );

    const evenCount = digitCounts
        .filter((_, index) => index % 2 === 0)
        .reduce((sum, value) => sum + value, 0);

    const oddCount = digitCounts
        .filter((_, index) => index % 2 !== 0)
        .reduce((sum, value) => sum + value, 0);

    const evenPercentage = percentage(
        evenCount,
        evenCount + oddCount
    );

    const oddPercentage = percentage(
        oddCount,
        evenCount + oddCount
    );

    const evenOddSequence = useMemo(() => {
        return recentTicks
            .map((tick) => {
                const digit = getLastDigit(tick);
                return digit % 2 === 0 ? 'E' : 'O';
            })
            .slice(-SEQUENCE_LENGTH);
    }, [recentTicks]);

    const options = [
        {
            id: 'rise-fall',
            title: 'Rise & Fall',
            description: 'Analyse price movement direction',
        },
        {
            id: 'matches-differs',
            title: 'Matches & Differs',
            description: 'Analyse last digit matches',
        },
        {
            id: 'over-under',
            title: 'Over & Under',
            description: 'Analyse digit barriers',
        },
        {
            id: 'even-odd',
            title: 'Even & Odd',
            description: 'Analyse even and odd digits',
        },
    ];

    const activeTitle =
        options.find((option) => option.id === activeMode)?.title ??
        'Analysis Tool';

    return (
        <div className="analysis-tool">
            <div className="analysis-topbar">
                <div>
                    <h1>Analysis Tool</h1>
                    <p>Live Deriv market analysis</p>
                </div>

                <select
                    value={market}
                    onChange={(event) => setMarket(event.target.value)}
                    className="analysis-market-select"
                >
                    {MARKETS.map((item) => (
                        <option
                            key={item.symbol}
                            value={item.symbol}
                        >
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="analysis-live-stats">
                <div className="analysis-stat">
                    <span>LIVE PRICE</span>
                    <strong>
                        {currentTick
                            ? currentTick.toFixed(2)
                            : '--'}
                    </strong>
                </div>

                <div className="analysis-stat">
                    <span>LAST DIGIT</span>
                    <strong>
                        {ticks.length ? currentDigit : '--'}
                    </strong>
                </div>

                <div className="analysis-stat">
                    <span>LIVE TICKS</span>
                    <strong>{ticks.length}</strong>
                </div>
            </div>

            <div className="analysis-content">
                <div className="analysis-mode-list">
                    <h2>Analysis Type</h2>

                    {options.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`analysis-mode-item ${
                                activeMode === option.id
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setActiveMode(option.id)
                            }
                        >
                            <div>
                                <strong>{option.title}</strong>
                                <span>{option.description}</span>
                            </div>

                            <span className="analysis-mode-arrow">
                                →
                            </span>
                        </button>
                    ))}
                </div>

                <div className="analysis-panel">
                    <div className="analysis-panel-header">
                        <div>
                            <h2>{activeTitle}</h2>
                            <p>
                                Live analysis for{' '}
                                {
                                    MARKETS.find(
                                        (item) =>
                                            item.symbol === market
                                    )?.label
                                }
                            </p>
                        </div>

                        <span className="analysis-live-indicator">
                            <i />
                            LIVE
                        </span>
                    </div>

                    {activeMode === 'rise-fall' && (
                        <div className="analysis-section">
                            <div className="analysis-bars">
                                <div className="analysis-bar-row">
                                    <div className="analysis-bar-signal rise">
                                        R
                                    </div>

                                    <div className="analysis-bar-label">
                                        RISE
                                    </div>

                                    <div className="analysis-bar-track">
                                        <div
                                            className="analysis-bar-fill"
                                            style={{
                                                width: `${risePercentage}%`,
                                            }}
                                        />
                                    </div>

                                    <strong className="analysis-bar-percent">
                                        {risePercentage}%
                                    </strong>
                                </div>

                                <div className="analysis-bar-row">
                                    <div className="analysis-bar-signal fall">
                                        F
                                    </div>

                                    <div className="analysis-bar-label">
                                        FALL
                                    </div>

                                    <div className="analysis-bar-track">
                                        <div
                                            className="analysis-bar-fill"
                                            style={{
                                                width: `${fallPercentage}%`,
                                            }}
                                        />
                                    </div>

                                    <strong className="analysis-bar-percent">
                                        {fallPercentage}%
                                    </strong>
                                </div>
                            </div>

                            <div className="analysis-sequence">
                                <h3>Recent Movement</h3>

                                <div className="analysis-sequence-list">
                                    {riseFallSequence.length ? (
                                        riseFallSequence.map(
                                            (item, index) => (
                                                <span
                                                    key={`${item}-${index}`}
                                                    className={
                                                        item === 'R'
                                                            ? 'rise'
                                                            : 'fall'
                                                    }
                                                >
                                                    {item}
                                                </span>
                                            )
                                        )
                                    ) : (
                                        <span className="analysis-empty">
                                            Waiting for live ticks...
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeMode === 'matches-differs' && (
                        <div className="analysis-section">
                            <div className="analysis-selector">
                                <h3>Select Number</h3>

                                <div className="analysis-number-selector">
                                    {MATCHES_BARRIERS.map((digit) => (
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
                            </div>

                            <div className="analysis-circle-layout analysis-line-layout">
                                <div className="analysis-main-circle analysis-percentage-line">
                                    <span className="analysis-line-title">
                                        MATCHES {selectedMatchDigit}
                                    </span>

                                    <div className="analysis-line-track">
                                        <div
                                            className="analysis-line-fill"
                                            style={{
                                                width: `${matchesPercentage}%`,
                                            }}
                                        />
                                    </div>

                                    <strong>
                                        {matchesPercentage}%
                                    </strong>
                                </div>

                                <div className="analysis-main-circle analysis-percentage-line">
                                    <span className="analysis-line-title">
                                        DIFFERS {selectedMatchDigit}
                                    </span>

                                    <div className="analysis-line-track">
                                        <div
                                            className="analysis-line-fill"
                                            style={{
                                                width: `${differsPercentage}%`,
                                            }}
                                        />
                                    </div>

                                    <strong>
                                        {differsPercentage}%
                                    </strong>
                                </div>
                            </div>

                            <div className="analysis-digit-grid">
                                {DIGITS.map((digit) => (
                                    <div
                                        key={digit}
                                        className={`analysis-digit ${
                                            currentDigit === digit
                                                ? 'current'
                                                : ''
                                        }`}
                                    >
                                        <span>{digit}</span>
                                        <strong>
                                            {digitPercentages[digit]}%
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeMode === 'over-under' && (
                        <div className="analysis-section">
                            <div className="analysis-selector">
                                <h3>Select Barrier</h3>

                                <div className="analysis-number-selector">
                                    {BARRIERS.map((barrier) => (
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
                            </div>

                            <div className="analysis-circle-layout analysis-line-layout">
                                <div className="analysis-main-circle analysis-percentage-line">
                                    <span className="analysis-line-title">
                                        OVER {selectedBarrier}
                                    </span>

                                    <div className="analysis-line-track">
                                        <div
                                            className="analysis-line-fill"
                                            style={{
                                                width: `${overPercentage}%`,
                                            }}
                                        />
                                    </div>

                                    <strong>
                                        {overPercentage}%
                                    </strong>
                                </div>

                                <div className="analysis-main-circle analysis-percentage-line">
                                    <span className="analysis-line-title">
                                        UNDER {selectedBarrier}
                                    </span>

                                    <div className="analysis-line-track">
                                        <div
                                            className="analysis-line-fill"
                                            style={{
                                                width: `${underPercentage}%`,
                                            }}
                                        />
                                    </div>

                                    <strong>
                                        {underPercentage}%
                                    </strong>
                                </div>
                            </div>

                            <div className="analysis-digit-grid">
                                {DIGITS.map((digit) => (
                                    <div
                                        key={digit}
                                        className={`analysis-digit ${
                                            currentDigit === digit
                                                ? 'current'
                                                : ''
                                        }`}
                                    >
                                        <span>{digit}</span>
                                        <strong>
                                            {digitPercentages[digit]}%
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeMode === 'even-odd' && (
                        <div className="analysis-section">
                            <div className="analysis-bars">
                                <div className="analysis-bar-row">
                                    <div className="analysis-bar-signal even">
                                        E
                                    </div>

                                    <div className="analysis-bar-label">
                                        EVEN
                                    </div>

                                    <div className="analysis-bar-track">
                                        <div
                                            className="analysis-bar-fill"
                                            style={{
                                                width: `${evenPercentage}%`,
                                            }}
                                        />
                                    </div>

                                    <strong className="analysis-bar-percent">
                                        {evenPercentage}%
                                    </strong>
                                </div>

                                <div className="analysis-bar-row">
                                    <div className="analysis-bar-signal odd">
                                        O
                                    </div>

                                    <div className="analysis-bar-label">
                                        ODD
                                    </div>

                                    <div className="analysis-bar-track">
                                        <div
                                            className="analysis-bar-fill"
                                            style={{
                                                width: `${oddPercentage}%`,
                                            }}
                                        />
                                    </div>

                                    <strong className="analysis-bar-percent">
                                        {oddPercentage}%
                                    </strong>
                                </div>
                            </div>

                            <div className="analysis-sequence">
                                <h3>Recent Results</h3>

                                <div className="analysis-sequence-list">
                                    {evenOddSequence.length ? (
                                        evenOddSequence.map(
                                            (item, index) => (
                                                <span
                                                    key={`${item}-${index}`}
                                                    className={
                                                        item === 'E'
                                                            ? 'even'
                                                            : 'odd'
                                                    }
                                                >
                                                    {item}
                                                </span>
                                            )
                                        )
                                    ) : (
                                        <span className="analysis-empty">
                                            Waiting for live ticks...
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisTool;
