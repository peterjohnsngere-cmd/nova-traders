import { useState } from 'react';
import ChartWrapper from '@/pages/chart/chart-wrapper';
import './analysis-tool.scss';

const AnalysisTool = () => {
    const [activeTab, setActiveTab] = useState<'analysis' | 'scanner'>('analysis');

    return (
        <div className='analysis-tool'>
            <div className='analysis-tool__tabs'>
                <button
                    className={activeTab === 'analysis' ? 'active' : ''}
                    onClick={() => setActiveTab('analysis')}
                >
                    ANALYSIS TOOL
                </button>

                <button
                    className={activeTab === 'scanner' ? 'active' : ''}
                    onClick={() => setActiveTab('scanner')}
                >
                    SCANNER
                </button>
            </div>

            {activeTab === 'analysis' ? (
                <div className='analysis-tool__content'>
                    <h2>Market Analysis</h2>

                    <div className='analysis-tool__chart'>
                        <ChartWrapper show_digits_stats={true} />
                    </div>

                    <p>Live market data and digit analysis</p>

                    <div className='analysis-tool__sections'>
                        <div className='analysis-card'>
                            <h3>LIVE TICK DATA</h3>
                            <div className='tick-value'>--</div>
                        </div>

                        <div className='analysis-card'>
                            <h3>LAST DIGITS</h3>

                            <div className='digit-circles'>
                                {Array.from({ length: 10 }, (_, digit) => (
                                    <div className='digit-circle' key={digit}>
                                        <span>{digit}</span>
                                        <small>0%</small>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className='analysis-card'>
                            <h3>OVER / UNDER</h3>

                            <div className='analysis-row'>
                                <span>OVER</span>
                                <strong>--%</strong>
                            </div>

                            <div className='analysis-row'>
                                <span>UNDER</span>
                                <strong>--%</strong>
                            </div>
                        </div>

                        <div className='analysis-card'>
                            <h3>EVEN / ODD</h3>

                            <div className='analysis-row'>
                                <span>EVEN</span>
                                <strong>--%</strong>
                            </div>

                            <div className='analysis-row'>
                                <span>ODD</span>
                                <strong>--%</strong>
                            </div>
                        </div>

                        <div className='analysis-card'>
                            <h3>MATCHES / DIFFERS</h3>

                            <div className='analysis-row'>
                                <span>MATCHES</span>
                                <strong>--%</strong>
                            </div>

                            <div className='analysis-row'>
                                <span>DIFFERS</span>
                                <strong>--%</strong>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='analysis-tool__scanner'>
                    <h2>Scanner</h2>
                    <p>Quickly scan the live market.</p>

                    <div className='scanner-card'>
                        <h3>MARKET SCAN</h3>
                        <p>Waiting for live tick data...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisTool;
