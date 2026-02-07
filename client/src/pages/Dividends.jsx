import React, { useState, useEffect } from 'react';
import { TrendingUp, IndianRupee, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import axios from 'axios';
import { formatIndianRupee } from '../utils/formatCurrency';
import api from '../services/api';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const Dividends = () => {
    const [summary, setSummary] = useState(null);
    const [byYear, setByYear] = useState([]);
    const [byScrip, setByScrip] = useState([]);
    const [byQuarter, setByQuarter] = useState([]);
    const [trends, setTrends] = useState([]);
    const [filterText, setFilterText] = useState('');

    // Period selection state
    const [period, setPeriod] = useState('fy'); // monthly, fy, custom - default to FY
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(2025); // Default to FY 2025-26
    const [customRange, setCustomRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const [selectedView, setSelectedView] = useState('overview');
    const [loading, setLoading] = useState(true);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchDividendData();
    }, [period, selectedMonth, selectedYear, customRange]);

    const fetchDividendData = async () => {
        setLoading(true);
        try {
            let startDate, endDate;

            // Calculate dates based on period
            if (period === 'monthly') {
                startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
                endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;
            } else if (period === 'fy') {
                // Financial Year (April to March)
                startDate = `${selectedYear}-04-01`;
                endDate = `${selectedYear + 1}-03-31`;
            } else {
                startDate = customRange.startDate;
                endDate = customRange.endDate;
            }

            const params = { startDate, endDate };

            const [summaryRes, byYearRes, byScripRes, byQuarterRes, trendsRes] = await Promise.all([
                api.get('/dividends/summary', { params }),
                api.get('/dividends/by-year', { params }),
                api.get('/dividends/by-scrip', { params }),
                api.get('/dividends/by-quarter', { params }),
                api.get('/dividends/trends', { params })
            ]);

            setSummary(summaryRes.data);
            setByYear(byYearRes.data);
            setByScrip(byScripRes.data);
            setByQuarter(byQuarterRes.data);
            setTrends(trendsRes.data);
        } catch (err) {
            console.error('Error fetching dividend data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate growth percentage
    const calculateGrowth = () => {
        if (byYear.length < 2) return 0;
        const currentYearData = byYear[byYear.length - 1];
        const previousYearData = byYear[byYear.length - 2];
        const growth = ((parseFloat(currentYearData.totalAmount) - parseFloat(previousYearData.totalAmount)) / parseFloat(previousYearData.totalAmount)) * 100;
        return growth.toFixed(2);
    };

    // Prepare chart data
    const yearlyChartData = {
        labels: byYear.map(y => y.year),
        datasets: [
            {
                label: 'Total Dividends',
                data: byYear.map(y => parseFloat(y.totalAmount)),
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2
            }
        ]
    };

    const scripChartData = {
        labels: byScrip.slice(0, 10).map(s => s.scrip || 'Unknown'),
        datasets: [
            {
                label: 'Dividend Amount',
                data: byScrip.slice(0, 10).map(s => parseFloat(s.totalAmount)),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(217, 70, 239, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(251, 113, 133, 0.8)',
                    'rgba(248, 113, 113, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(163, 230, 53, 0.8)'
                ],
                borderWidth: 0
            }
        ]
    };

    const quarterlyChartData = {
        labels: byQuarter.map(q => `Q${q.quarter} ${q.year}`),
        datasets: [
            {
                label: 'Quarterly Dividends',
                data: byQuarter.map(q => parseFloat(q.totalAmount)),
                backgroundColor: 'rgba(139, 92, 246, 0.7)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 2
            }
        ]
    };

    const trendChartData = {
        labels: trends.map(t => `${t.year}-${String(t.month).padStart(2, '0')}`),
        datasets: [
            {
                label: 'Monthly Dividend Trend',
                data: trends.map(t => parseFloat(t.totalAmount)),
                fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderColor: 'rgba(99, 102, 241, 1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleColor: '#fff',
                bodyColor: '#fff',
                callbacks: {
                    label: function (context) {
                        return formatIndianRupee(context.raw);
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    callback: function (value) {
                        return '₹' + (value / 1000) + 'k';
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)'
                }
            }
        }
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                    padding: 15,
                    font: {
                        size: 11
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                callbacks: {
                    label: function (context) {
                        const label = context.label || '';
                        const value = formatIndianRupee(context.raw);
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((context.raw / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };

    if (loading) {
        return (
            <section className="journal-section">
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading dividend data...
                </div>
            </section>
        );
    }

    return (
        <section className="journal-section">
            <div className="header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h2>Dividend Income Dashboard</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Track dividend income by period, scrip, and quarter
                    </p>
                </div>
            </div>

            {/* Period Filter */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'linear-gradient(145deg, var(--card-bg), rgba(255,255,255,0.02))' }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: '160px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Period Type
                        </label>
                        <select
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                        >
                            <option value="monthly">Monthly View</option>
                            <option value="fy">Financial Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {period === 'monthly' && (
                        <>
                            <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Month
                                </label>
                                <select
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                >
                                    {months.map((month, idx) => (
                                        <option key={idx} value={idx + 1}>{month}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, minWidth: '100px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Year
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                                >
                                    {[2024, 2025, 2026, 2027].map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {period === 'fy' && (
                        <div className="form-group" style={{ marginBottom: 0, minWidth: '160px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                FY STARTING
                            </label>
                            <select
                                value={selectedYear}
                                onChange={e => setSelectedYear(parseInt(e.target.value))}
                            >
                                {[2024, 2025, 2026, 2027].map(year => (
                                    <option key={year} value={year}>FY {year}-{year + 1}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {period === 'custom' && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={customRange.startDate}
                                    onChange={e => setCustomRange({ ...customRange, startDate: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={customRange.endDate}
                                    onChange={e => setCustomRange({ ...customRange, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', height: '100%' }}>
                        <div style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(99, 102, 241, 0.1)',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            color: 'var(--primary)',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Calendar size={16} />
                            {period === 'monthly' && `${months[selectedMonth - 1]} ${selectedYear}`}
                            {period === 'fy' && `FY ${selectedYear}-${selectedYear + 1}`}
                            {period === 'custom' && `${customRange.startDate} to ${customRange.endDate}`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Total Dividends
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--accent)' }}>
                                    {formatIndianRupee(summary.totalDividends)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {summary.transactionCount} payments
                                </div>
                            </div>
                            <IndianRupee size={32} style={{ color: 'var(--accent)', opacity: 0.3 }} />
                        </div>
                    </div>

                    {byYear.length >= 2 && (
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        YoY Growth
                                    </div>
                                    <div style={{
                                        fontSize: '1.8rem',
                                        fontWeight: '700',
                                        color: calculateGrowth() >= 0 ? '#10b981' : '#ef4444'
                                    }}>
                                        {calculateGrowth() >= 0 ? '+' : ''}{calculateGrowth()}%
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        vs previous year
                                    </div>
                                </div>
                                <TrendingUp size={32} style={{ color: calculateGrowth() >= 0 ? '#10b981' : '#ef4444', opacity: 0.3 }} />
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Dividend Stocks
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#a78bfa' }}>
                                    {summary.uniqueScrips}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    unique scrips
                                </div>
                            </div>
                            <PieChartIcon size={32} style={{ color: '#a78bfa', opacity: 0.3 }} />
                        </div>
                    </div>

                    {byYear.length > 0 && (
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        Latest Year
                                    </div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>
                                        {formatIndianRupee(byYear[byYear.length - 1].totalAmount)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        {byYear[byYear.length - 1].year}
                                    </div>
                                </div>
                                <Calendar size={32} style={{ color: '#f59e0b', opacity: 0.3 }} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* View Tabs */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                    <button
                        className={`nav-item ${selectedView === 'overview' ? 'active' : ''}`}
                        style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', border: 'none', background: 'none', flex: 1 }}
                        onClick={() => setSelectedView('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`nav-item ${selectedView === 'charts' ? 'active' : ''}`}
                        style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', border: 'none', background: 'none', flex: 1 }}
                        onClick={() => setSelectedView('charts')}
                    >
                        Charts
                    </button>
                    <button
                        className={`nav-item ${selectedView === 'details' ? 'active' : ''}`}
                        style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', border: 'none', background: 'none', flex: 1 }}
                        onClick={() => setSelectedView('details')}
                    >
                        Details
                    </button>
                </div>
            </div>

            {/* Overview View */}
            {selectedView === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                    {/* Yearly Chart */}
                    {byYear.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Dividends by Year</h3>
                            <div style={{ height: '300px' }}>
                                <Bar data={yearlyChartData} options={chartOptions} />
                            </div>
                        </div>
                    )}

                    {/* Scrip Distribution */}
                    {byScrip.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Top Dividend Payers</h3>
                            <div style={{ height: '300px' }}>
                                <Pie data={scripChartData} options={pieOptions} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Charts View */}
            {selectedView === 'charts' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    {/* Quarterly Breakdown */}
                    {byQuarter.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Quarterly Breakdown</h3>
                            <div style={{ height: '350px' }}>
                                <Bar data={quarterlyChartData} options={chartOptions} />
                            </div>
                        </div>
                    )}

                    {/* Trend Line */}
                    {trends.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Dividend Trend (Monthly)</h3>
                            <div style={{ height: '350px' }}>
                                <Line data={trendChartData} options={chartOptions} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Details View */}
            {selectedView === 'details' && (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* By Scrip Table */}
                    {byScrip.length > 0 && (
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', padding: '1.5rem 1.5rem 0' }}>By Scrip</h3>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Scrip</th>
                                            <th>Total Dividends</th>
                                            <th>Payments Count</th>
                                            <th>% of Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {byScrip.map((item, idx) => {
                                            const totalSum = byScrip.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
                                            const percentage = ((parseFloat(item.totalAmount) / totalSum) * 100).toFixed(1);
                                            return (
                                                <tr key={idx}>
                                                    <td style={{ fontWeight: '600' }}>{item.scrip || 'Unknown'}</td>
                                                    <td style={{ color: 'var(--accent)' }}>{formatIndianRupee(parseFloat(item.totalAmount))}</td>
                                                    <td style={{ color: 'var(--text-muted)' }}>{item.count}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{
                                                                flex: 1,
                                                                height: '6px',
                                                                background: 'rgba(255,255,255,0.1)',
                                                                borderRadius: '3px',
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    width: `${percentage}%`,
                                                                    height: '100%',
                                                                    background: 'var(--accent)',
                                                                    borderRadius: '3px'
                                                                }} />
                                                            </div>
                                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                {percentage}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* By Quarter Table */}
                    {byQuarter.length > 0 && (
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', padding: '1.5rem 1.5rem 0' }}>By Quarter</h3>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Year</th>
                                            <th>Quarter</th>
                                            <th>Total Dividends</th>
                                            <th>Payments Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {byQuarter.map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: '600' }}>{item.year}</td>
                                                <td>Q{item.quarter}</td>
                                                <td style={{ color: 'var(--accent)' }}>{formatIndianRupee(parseFloat(item.totalAmount))}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{item.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Detailed Transactions */}
                    {summary?.transactions && summary.transactions.length > 0 && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 1.5rem 0', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>All Dividend Transactions</h3>
                                <input
                                    type="text"
                                    placeholder="Filter by Scrip, Account, Description..."
                                    value={filterText}
                                    onChange={e => setFilterText(e.target.value)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#fff',
                                        minWidth: '300px'
                                    }}
                                />
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Scrip</th>
                                            <th>Account</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.transactions
                                            .filter(txn => {
                                                if (!filterText) return true;
                                                const search = filterText.toLowerCase();
                                                return (
                                                    (txn.transactionDate && txn.transactionDate.toLowerCase().includes(search)) ||
                                                    (txn.scrip && txn.scrip.toLowerCase().includes(search)) ||
                                                    (txn.Account?.name && txn.Account.name.toLowerCase().includes(search)) ||
                                                    (txn.description && txn.description.toLowerCase().includes(search)) ||
                                                    (txn.amount && txn.amount.toString().includes(search))
                                                );
                                            })
                                            .map(txn => (
                                                <tr key={txn.id}>
                                                    <td>{txn.transactionDate}</td>
                                                    <td style={{ fontWeight: '600', color: 'var(--accent)' }}>{txn.scrip || '-'}</td>
                                                    <td style={{ color: 'var(--text-muted)' }}>{txn.Account?.name || '-'}</td>
                                                    <td style={{ color: 'var(--text-muted)' }}>{txn.description || '-'}</td>
                                                    <td style={{ fontWeight: '600', color: 'var(--accent)' }}>
                                                        {formatIndianRupee(parseFloat(txn.amount))}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!summary || summary.transactionCount === 0 && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <IndianRupee size={64} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 1rem' }} />
                    <h3 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No Dividend Data</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Add dividend transactions in the Cashflow section with category "Dividend"
                    </p>
                </div>
            )}
        </section>
    );
}

export default Dividends;
