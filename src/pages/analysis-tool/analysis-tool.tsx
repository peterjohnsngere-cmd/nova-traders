import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton';
import ChartWrapper from '@/pages/chart/chart-wrapper';
import './analysis-tool.scss';

type Tab = 'analysis' | 'scanner';

const MARKETS = [
    { value: 'R_10', label: 'Volatility 10' },
    { value: 'R_25', label: 'Volatility 25' },
    { value: 'R_50', label: 'Volatility 50' },
    { value: 'R_75', label: 'Volatility 75' },
    { value: 'R_100', label: 'Volatility 100' },
    { value: '1HZ10V', label: 'Volatility 10 (1s)' },
    { value: '1HZ25V', label: 'Volatility 25 (1s)' },
    { value: '1HZ50V', label: 'Volatility 50 (1s)' },
    { value: '1HZ75V', label: 'Volatility 75 (1s)' },
    { value: '1HZ100V', label: 'Volatility 100 (1s)' },
    { value: 'BOOM1000', label: 'Boom 1000' },
    { value: 'BOOM500', label: 'Boom 500' },
    { value: 'CRASH1000', label: 'Crash 1000' },
    { value: 'CRASH500', label: 'Crash 500' },
];

const DIGITS = Array.from({ length: 10 }, (_, index) => index);

const getLastDigit = (quote: number): number => {
    const text = String(quote);
    const digits = text.replace(/\D/g, '');
    return Number(digits.charAt(digits.length - 1));
};

const getPercent = (value: number, total: number): number => {
    if (!total) return 0;
    return Number(((value / total) * 100).toFixed(1));
};

const AnalysisTool = () => {
    const [activeTab, setActiveTab] = useState<Tab>('analysis');
    const [market, setMarket] = useState('R_75');
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [digitCounts, setDigitCounts] = useState<number[]>(
        Array(10).fill(0)
    );
    const [recentDigits, setRecentDigits] = useState<number[]>([]);
    const [selectedDigit, setSelectedDigit] = useState(5);
    const [evenSignal, setEvenSignal] = useState(false);
    const [oddSignal, setOddSignal] = useState(false);

    const tickSubscriptionRef = useRef<any>(null);

    /* =========================
       LIVE DERIV TICK STREAM
       ========================= */

    useEffect(() => {
        if (!api_base.api) return;

        const subscribe = async () => {
            try {
                if (tickSubscriptionRef.current) {
                    await api_base.api.send({
                        forget: tickSubscriptionRef.current,
                    });
                }

                setCurrentPrice(null);
                setDigitCounts(Array(10).fill(0));
                setRecentDigits([]);

                const response = await api_base.api.send({
                    ticks: market,
                    subscribe: 1,
                });

                if (response?.subscription?.id) {
                    tickSubscriptionRef.current =
                        response.subscription.id;
                }
            } catch {
                // Keep the existing Deriv connection alive.
            }
        };

        subscribe();

        return () => {
            if (
                tickSubscriptionRef.current &&
                api_base.api
            ) {
                api_base.api
                    .send({
                        forget: tickSubscriptionRef.current,
                    })
                    .catch(() => undefined);

                tickSubscriptionRef.current = null;
            }
        };
    }, [market]);

    /* =========================
       RECEIVE LIVE TICKS
       ========================= */

    useEffect(() => {
        if (!api_base.api) return;

        const subscription = api_base.api
            .onMessage()
            .subscribe(({ data }: any) => {
                if (data?.msg_type !== 'tick') return;

                const tick = data.tick;

                if (
                    tick?.symbol &&
                    tick.symbol !== market
                ) {
                    return;
                }

                const quote = Number(tick?.quote);

                if (!Number.isFinite(quote)) return;

                const lastDigit = getLastDigit(quote);

                if (
                    !Number.isInteger(lastDigit) ||
                    lastDigit < 0 ||
                    lastDigit > 9
                ) {
                    return;
                }

                setCurrentPrice(quote);

                setDigitCounts(previous => {
                    const next = [...previous];
                    next[lastDigit] += 1;

                    const total = next.reduce(
                        (sum, value) => sum + value,
                        0
                    );

                    if (total > 100) {
                        const largestIndex = next.indexOf(
                            Math.max(...next)
                        );

                        if (largestIndex >= 0) {
                            next[largestIndex] = Math.max(
                                0,
                                next[largestIndex] - 1
                            );
                        }
                    }

                    return next;
                });

                setRecentDigits(previous => [
                    ...previous.slice(-19),
                    lastDigit,
                ]);
            });

        return () => {
            subscription?.unsubscribe?.();
        };
    }, [market]);

    /* =========================
       LIVE STATISTICS
       ========================= */

    const totalTicks = useMemo(
        () => digitCounts.reduce((sum, value) => sum + value, 0),
        [digitCounts]
    );

    const digitPercentages = useMemo(
        () =>
            digitCounts.map(value =>
                getPercent(value, totalTicks)
            ),
        [digitCounts, totalTicks]
    );

    const evenCount = useMemo(
        () =>
            digitCounts.reduce(
                (sum, value, digit) =>
                    digit % 2 === 0 ? sum + value : sum,
                0
            ),
        [digitCounts]
    );

    const oddCount = totalTicks - evenCount;

    const evenPercentage = getPercent(
        evenCount,
        totalTicks
    );

    const oddPercentage = getPercent(
        oddCount,
        totalTicks
    );

    const overCount = digitCounts.reduce(
        (sum, value, digit) =>
            digit > selectedDigit ? sum + value : sum,
        0
    );

    const underCount = digitCounts.reduce(
        (sum, value, digit) =>
            digit < selectedDigit ? sum + value : sum,
        0
    );

    const equalCount = digitCounts[selectedDigit] || 0;

    const overPercentage = getPercent(
        overCount,
        totalTicks
    );

    const underPercentage = getPercent(
        underCount,
        totalTicks
    );

    const selectedDigitPercentage = getPercent(
        equalCount,
        totalTicks
    );

    const matchesPercentage = selectedDigitPercentage;

    const differsPercentage = Number(
        (100 - matchesPercentage).toFixed(1)
    );

    const strongestDigit = digitPercentages.indexOf(
        Math.max(...digitPercentages)
    );

    const weakestDigit = digitPercentages.indexOf(
        Math.min(
            ...digitPercentages.filter(
                value => value >= 0
            )
        )
    );

    const evenIsHigher =
        evenPercentage >= oddPercentage;

    const overIsHigher =
        overPercentage >= underPercentage;

    /* =========================
       DISPLAY HELPERS
       ========================= */

    const formatPrice = (price: number | null) => {
        if (price === null) return '--';

        return price.toFixed(
            price < 10 ? 3 : 2
        );
    };

    const marketLabel =
        MARKETS.find(item => item.value === market)
            ?.label || market;

    /* =========================
       ANALYSIS VIEW
       ========================= */

    const renderAnalysis = () => (
        <div className="analysis-tool__content">
            <div className="analysis-tool__header">
                <div>
                    <h2>ANALYSIS TOOL</h2>
                    <p>
                        Live market analysis from the
                        current Deriv tick stream.
                    </p>
                </div>

                <div className="analysis-tool__market">
                    <label htmlFor="analysis-market">
                        MARKET
                    </label>

                    <select
                        id="analysis-market"
                        value={market}
                        onChange={event =>
                            setMarket(event.target.value)
                        }
                    >
                        {MARKETS.map(item => (
                            <option
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="analysis-tool__chart">
                <ChartWrapper
                    prefix="analysis-tool-chart"
                    show_digits_stats={false}
                />
            </div>

            <div className="analysis-tool__live">
                <div className="analysis-card">
                    <h3>LIVE PRICE</h3>

                    <div className="tick-value">
                        {formatPrice(currentPrice)}
                    </div>

                    <small>{marketLabel}</small>
                </div>

                <div className="analysis-card">
                    <h3>TICKS ANALYSED</h3>

                    <div className="tick-value">
                        {totalTicks}
                    </div>

                    <small>
                        Live observations
                    </small>
                </div>
            </div>

            <div className="analysis-tool__sections">

                {/* LAST DIGITS */}

                <div className="analysis-card">
                    <h3>LAST DIGITS</h3>

                    <p className="analysis-note">
                        Live percentage for each final
                        digit.
                    </p>

                    <div className="digit-circles">
                        {DIGITS.map(digit => (
                            <button
                                key={digit}
                                type="button"
                                className={`digit-circle ${
                                    selectedDigit === digit
                                        ? 'selected'
                                        : ''
                                }`}
                                onClick={() =>
                                    setSelectedDigit(digit)
                                }
                            >
                                <span>{digit}</span>

                                <small>
                                    {digitPercentages[digit]}%
                                </small>
                            </button>
                        ))}
                    </div>
                </div>

                {/* OVER / UNDER */}

                <div className="analysis-card">
                    <h3>OVER / UNDER</h3>

                    <p className="analysis-note">
                        Barrier: {selectedDigit}
                    </p>

                    <div className="over-under-panel">
                        <div className="barrier-selector">
                            <span>
                                SELECT BARRIER
                            </span>

                            <div>
                                {DIGITS.map(digit => (
                                    <button
                                        key={digit}
                                        type="button"
                                        className={
                                            selectedDigit === digit
                                                ? 'active'
                                                : ''
                                        }
                                        onClick={() =>
                                            setSelectedDigit(
                                                digit
                                            )
                                        }
                                    >
                                        {digit}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="over-under-circles">
                            <div
                                className={`over-under-circle ${
                                    overIsHigher
                                        ? 'active'
                                        : ''
                                }`}
                            >
                                <strong>
                                    {overPercentage}%
                                </strong>

                                <span>OVER</span>
                            </div>

                            <div
                                className={`over-under-circle ${
                                    !overIsHigher
                                        ? 'active'
                                        : ''
                                }`}
                            >
                                <strong>
                                    {underPercentage}%
                                </strong>

                                <span>UNDER</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* EVEN / ODD */}

                <div className="analysis-card">
                    <h3>EVEN / ODD</h3>

                    <p className="analysis-note">
                        The higher live percentage is
                        highlighted.
                    </p>

                    <div className="even-odd-panel">
                        <div className="even-odd-blocks">
                            <div
                                className={`even-odd-block ${
                                    evenIsHigher
                                        ? 'active'
                                        : ''
                                }`}
                            >
                                <div className="even-odd-block__label">
                                    EVEN
                                </div>

                                <div className="even-odd-block__percentage">
                                    {evenPercentage}%
                                </div>
                            </div>

                            <div
                                className={`even-odd-block ${
                                    !evenIsHigher
                                        ? 'active'
                                        : ''
                                }`}
                            >
                                <div className="even-odd-block__label">
                                    ODD
                                </div>

                                <div className="even-odd-block__percentage">
                                    {oddPercentage}%
                                </div>
                            </div>
                        </div>

                        <div className="eo-controls">
                            <button
                                type="button"
                                className={`eo-control ${
                                    evenSignal
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() => {
                                    setEvenSignal(true);
                                    setOddSignal(false);
                                }}
                            >
                                E
                            </button>

                            <button
                                type="button"
                                className={`eo-control ${
                                    oddSignal
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() => {
                                    setOddSignal(true);
                                    setEvenSignal(false);
                                }}
                            >
                                O
                            </button>
                        </div>

                        <div className="sequence-strip">
                            {recentDigits
                                .slice(-10)
                                .map((digit, index) => (
                                    <div
                                        key={`${digit}-${index}`}
                                        className={`sequence-digit ${
                                            digit % 2 === 0
                                                ? 'even'
                                                : 'odd'
                                        }`}
                                    >
                                        {digit}
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* MATCHES / DIFFERS */}

                <div className="analysis-card">
                    <h3>MATCHES / DIFFERS</h3>

                    <p className="analysis-note">
                        Based on selected digit: {selectedDigit}
                    </p>

                    <div className="matches-differs-panel">
                        <div className="matches-circles">
                            {DIGITS.map(digit => {
                                const percentage =
                                    digitPercentages[digit];

                                return (
                                    <button
                                        key={digit}
                                        type="button"
                                        className={`matches-circle ${
                                            selectedDigit === digit
                                                ? 'active'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            setSelectedDigit(
                                                digit
                                            )
                                        }
                                    >
                                        <strong>
                                            {digit}
                                        </strong>

                                        <span>
                                            {percentage}%
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* MATCH / DIFFER SUMMARY */}

                <div className="analysis-card">
                    <h3>MATCH / DIFFER</h3>

                    <div className="analysis-summary">
                        <div>
                            <span>MATCHES</span>
                            <strong>
                                {matchesPercentage}%
                            </strong>
                        </div>

                        <div>
                            <span>DIFFERS</span>
                            <strong>
                                {differsPercentage}%
                            </strong>
                        </div>

                        <div>
                            <span>DIGIT</span>
                            <strong>
                                {selectedDigit}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* STRONGEST / WEAKEST */}

                <div className="analysis-card">
                    <h3>DIGIT STRENGTH</h3>

                    <div className="analysis-summary">
                        <div>
                            <span>STRONGEST</span>
                            <strong>
                                {totalTicks
                                    ? strongestDigit
                                    : '--'}
                            </strong>
                        </div>

                        <div>
                            <span>WEAKEST</span>
                            <strong>
                                {totalTicks
                                    ? weakestDigit
                                    : '--'}
                            </strong>
                        </div>

                        <div>
                            <span>SELECTED</span>
                            <strong>
                                {selectedDigit}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    /* =========================
       SCANNER VIEW
       ========================= */

    const renderScanner = () => (
        <div className="analysis-tool__scanner">
            <div className="analysis-tool__header">
                <div>
                    <h2>SCANNER</h2>

                    <p>
                        Quick live scan of the current
                        Deriv market.
                    </p>
                </div>

                <div className="analysis-tool__market">
                    <label htmlFor="scanner-market">
                        MARKET
                    </label>

                    <select
                        id="scanner-market"
                        value={market}
                        onChange={event =>
                            setMarket(event.target.value)
                        }
                    >
                        {MARKETS.map(item => (
                            <option
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="scanner-card">
                <h3>MARKET SCAN</h3>

                <div className="scanner-grid">
                    <div>
                        <span>STRONGEST DIGIT</span>
                        <strong>
                            {totalTicks
                                ? strongestDigit
                                : '--'}
                        </strong>
                    </div>

                    <div>
                        <span>WEAKEST DIGIT</span>
                        <strong>
                            {totalTicks
                                ? weakestDigit
                                : '--'}
                        </strong>
                    </div>

                    <div>
                        <span>EVEN</span>
                        <strong>
                            {evenPercentage}%
                        </strong>
                    </div>

                    <div>
                        <span>ODD</span>
                        <strong>
                            {oddPercentage}%
                        </strong>
                    </div>

                    <div>
                        <span>OVER</span>
                        <strong>
                            {overPercentage}%
                        </strong>
                    </div>

                    <div>
                        <span>UNDER</span>
                        <strong>
                            {underPercentage}%
                        </strong>
                    </div>
                </div>

                <div className="scanner-digit-selector">
                    <span>
                        SELECT DIGIT FOR MATCH / DIFFER
                    </span>

                    <div>
                        {DIGITS.map(digit => (
                            <button
                                key={digit}
                                type="button"
                                className={
                                    selectedDigit === digit
                                        ? 'active'
                                        : ''
                                }
                                onClick={() =>
                                    setSelectedDigit(digit)
                                }
                            >
                                {digit}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="scanner-card">
                <h3>MATCHES / DIFFERS</h3>

                <div className="matches-circles">
                    {DIGITS.map(digit => (
                        <button
                            key={digit}
                            type="button"
                            className={`matches-circle ${
                                selectedDigit === digit
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setSelectedDigit(digit)
                            }
                        >
                            <strong>{digit}</strong>

                            <span>
                                {digitPercentages[digit]}%
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="scanner-card">
                <h3>RECENT DIGITS</h3>

                <div className="sequence-strip">
                    {recentDigits
                        .slice(-20)
                        .map((digit, index) => (
                            <div
                                key={`${digit}-${index}`}
                                className={`sequence-digit ${
                                    digit % 2 === 0
                                        ? 'even'
                                        : 'odd'
                                }`}
                            >
                                {digit}
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );

    /* =========================
       MAIN RETURN
       ========================= */

    return (
        <div className="analysis-tool">

            <div className="analysis-tool__tabs">
                <button
                    type="button"
                    className={
                        activeTab === 'analysis'
                            ? 'active'
                            : ''
                    }
                    onClick={() =>
                        setActiveTab('analysis')
                    }
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
                    onClick={() =>
                        setActiveTab('scanner')
                    }
                >
                    SCANNER
                </button>
            </div>

            {activeTab === 'analysis'
                ? renderAnalysis()
                : renderScanner()}
        </div>
    );
};

export default AnalysisTool;
