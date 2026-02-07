import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import api from '../services/api';

function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'expense',
        parentCategory: '',
        displayOrder: 0,
        isInvestment: false
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/categories');
            setCategories(res.data);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await api.put(`/categories/${editingId}`, formData);
            } else {
                await api.post('/categories', formData);
            }
            setFormData({ name: '', type: 'expense', parentCategory: '', displayOrder: 0, isInvestment: false });
            setEditingId(null);
            fetchCategories();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (category) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            type: category.type,
            parentCategory: category.parentCategory || '',
            displayOrder: category.displayOrder,
            isInvestment: category.isInvestment || false
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;
        try {
            await api.delete(`/categories/${id}`);
            fetchCategories();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    const renderCategoryTable = (cats, type) => (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{
                marginBottom: '1rem',
                color: type === 'income' ? 'var(--accent)' : '#ef4444',
                textTransform: 'capitalize'
            }}>
                {type} Categories ({cats.length})
            </h3>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Parent Category</th>
                            <th>Display Order</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cats.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No {type} categories found
                                </td>
                            </tr>
                        ) : (
                            cats.map(cat => (
                                <tr key={cat.id}>
                                    <td style={{ fontWeight: '600' }}>
                                        {cat.name}
                                        {cat.isInvestment && (
                                            <span style={{
                                                marginLeft: '8px',
                                                fontSize: '0.75rem',
                                                background: 'rgba(16, 185, 129, 0.2)',
                                                color: '#10B981',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(16, 185, 129, 0.3)'
                                            }}>
                                                ASSET
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>
                                        {cat.parentCategory || '-'}
                                    </td>
                                    <td>{cat.displayOrder}</td>
                                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="action-btn edit"
                                            title="Edit Category"
                                            onClick={() => handleEdit(cat)}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            title="Delete Category"
                                            onClick={() => handleDelete(cat.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <section className="journal-section">
            <div className="header" style={{ marginBottom: '1.5rem' }}>
                <h2>Manage Categories</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    Create and manage income and expense categories for cashflow tracking
                </p>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>
                    {editingId ? 'Edit Category' : 'Add New Category'}
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 0.5fr auto auto', gap: '1rem', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Category Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Groceries"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Type</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Parent Category (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Food"
                            value={formData.parentCategory}
                            onChange={e => setFormData({ ...formData, parentCategory: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Order</label>
                        <input
                            type="number"
                            value={formData.displayOrder}
                            onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                            style={{ width: '70px' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, paddingBottom: '5px', alignSelf: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
                            <input
                                type="checkbox"
                                checked={formData.isInvestment}
                                onChange={e => setFormData({ ...formData, isInvestment: e.target.checked })}
                                style={{ width: 'auto' }}
                            />
                            Investment
                        </label>
                    </div>
                    <button type="submit" className="btn" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
                        {loading ? 'Saving...' : (editingId ? <><Save size={16} style={{ marginRight: '4px' }} /> Update</> : <><Plus size={16} style={{ marginRight: '4px' }} /> Add</>)}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            className="btn outline"
                            onClick={() => {
                                setEditingId(null);
                                setFormData({ name: '', type: 'expense', parentCategory: '', displayOrder: 0 });
                            }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </form>
            </div>

            {renderCategoryTable(incomeCategories, 'income')}
            {renderCategoryTable(expenseCategories, 'expense')}
        </section>
    );
}

export default Categories;
