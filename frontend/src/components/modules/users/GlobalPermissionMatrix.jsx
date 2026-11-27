import React, { useState, useEffect, useMemo } from 'react';
import { useGetAllPossiblePermissionsQuery, useGetUserPermissionsQuery, useUpdateUserPermissionsMutation } from '../../../redux/api/authApi';
import { Save, ShieldCheck, Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import Loader from '../../shared/loader/Loader';
import Header from '../../shared/sidebar/Header';
import SelectDropdown from '../../shared/form-fields/SelectDropdown';
import ActiveFilterChips from '../../shared/search-export/ActiveFilterChips';
import { toast } from 'react-toastify';

const ACTIONS = [
    { key: 'read', label: 'View' },
    { key: 'create', label: 'Create' },
    { key: 'update', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
    { key: 'execute', label: 'Execute' },
];

const GlobalPermissionMatrix = ({ user, onBack }) => {
    const { data: allPermissionsData, isLoading: isLoadingAll, error: errorAll } = useGetAllPossiblePermissionsQuery();
    const { data: userPermissionsData, isLoading: isLoadingUser, error: errorUser } = useGetUserPermissionsQuery(user._id || user.id);
    const [updateUserPermissions, { isLoading: isUpdating }] = useUpdateUserPermissionsMutation();

    const [permissions, setPermissions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [statusFilter, setStatusFilter] = useState('all');
    const [collapsedCategories, setCollapsedCategories] = useState({});

    const permissionsString = JSON.stringify(userPermissionsData?.permissions || []);

    useEffect(() => {
        if (permissionsString) {
            setPermissions(JSON.parse(permissionsString));
        }
    }, [permissionsString]);

    const masterPermissions = useMemo(() => {
        return allPermissionsData?.permissions?.superadmin || [];
    }, [allPermissionsData]);

    const allAccessTypes = useMemo(() => {
        return [...new Set(masterPermissions.flatMap(p => p.access || []))];
    }, [masterPermissions]);

    // Toggle a single action checkbox (read, create, update, delete, execute)
    const handleActionToggle = (featureName, actionType) => {
        setPermissions(current => {
            const copy = JSON.parse(JSON.stringify(current));
            let feature = copy.find(p => p.feature === featureName);

            if (!feature) {
                feature = { feature: featureName, access: [actionType] };
                copy.push(feature);
            } else {
                const currentAccess = feature.access || [];
                const idx = currentAccess.indexOf(actionType);
                if (idx > -1) {
                    feature.access = currentAccess.filter(a => a !== actionType);
                } else {
                    feature.access = [...currentAccess, actionType];
                }
            }
            return copy;
        });
    };

    // Master row checkbox: toggles all available permissions for this module
    const handleRowToggleAll = (featureName, availableTypes) => {
        setPermissions(current => {
            const copy = JSON.parse(JSON.stringify(current));
            let feature = copy.find(p => p.feature === featureName);
            const currentAccess = feature?.access || [];
            const allGranted = availableTypes.length > 0 && availableTypes.every(t => currentAccess.includes(t));

            if (allGranted) {
                // Revoke all actions for this module
                if (feature) feature.access = [];
            } else {
                // Grant all available actions
                if (feature) {
                    feature.access = [...availableTypes];
                } else {
                    copy.push({ feature: featureName, access: [...availableTypes] });
                }
            }
            return copy;
        });
    };

    // Category grant all / revoke all
    const handleCategoryToggleAll = (items, grantAll) => {
        setPermissions(current => {
            const copy = JSON.parse(JSON.stringify(current));
            items.forEach(item => {
                const availableTypes = item.access || allAccessTypes;
                let feature = copy.find(p => p.feature === item.feature);

                if (grantAll) {
                    if (feature) {
                        feature.access = [...availableTypes];
                    } else {
                        copy.push({ feature: item.feature, access: [...availableTypes] });
                    }
                } else {
                    if (feature) {
                        feature.access = [];
                    }
                }
            });
            return copy;
        });
    };

    const toggleCategoryCollapse = (category) => {
        setCollapsedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleSave = async () => {
        try {
            await updateUserPermissions({ id: user._id || user.id, permissions }).unwrap();
            toast.success('Permissions updated successfully!');
            onBack();
        } catch {
            toast.error('Failed to update permissions.');
        }
    };

    // Group permissions by category
    const groupedPermissions = useMemo(() => {
        return masterPermissions.reduce((acc, item) => {
            const category = item.category || '7. Other Features';
            const displayName = item.name || item.feature.replace(/^(Page|Tab|Button|Action)_/, '').replace(/([A-Z])/g, ' $1').trim();
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push({
                ...item,
                displayName,
                description: item.description || ''
            });
            return acc;
        }, {});
    }, [masterPermissions]);

    // Categories list for filter dropdown
    const categoriesList = useMemo(() => {
        return ['All', ...Object.keys(groupedPermissions)];
    }, [groupedPermissions]);

    const categoryOptions = useMemo(() => {
        return categoriesList.map(cat => {
            const label = cat === 'All' ? 'All Modules' : cat.replace(/^\d+\.\s*/, '');
            const count = cat === 'All' ? masterPermissions.length : (groupedPermissions[cat]?.length || 0);
            return {
                value: cat,
                label: `${label} (${count})`,
            };
        });
    }, [categoriesList, masterPermissions.length, groupedPermissions]);

    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'enabled', label: 'Enabled Only' },
        { value: 'disabled', label: 'Disabled Only' },
    ];

    // Filtered permissions based on category, status, and search query
    const filteredGroupedPermissions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const result = {};

        Object.entries(groupedPermissions).forEach(([category, items]) => {
            if (selectedCategory !== 'All' && selectedCategory !== category) {
                return;
            }

            const matchedItems = items.filter(item => {
                // Status Filter
                if (statusFilter !== 'all') {
                    const p = permissions.find(x => x.feature === item.feature);
                    const isEnabled = p && p.access && p.access.length > 0;
                    if (statusFilter === 'enabled' && !isEnabled) return false;
                    if (statusFilter === 'disabled' && isEnabled) return false;
                }

                // Search Query
                if (!query) return true;
                return (
                    item.displayName.toLowerCase().includes(query) ||
                    item.feature.toLowerCase().includes(query) ||
                    item.description.toLowerCase().includes(query) ||
                    category.toLowerCase().includes(query)
                );
            });

            if (matchedItems.length > 0) {
                result[category] = matchedItems;
            }
        });

        return result;
    }, [groupedPermissions, selectedCategory, searchQuery, statusFilter, permissions]);

    // Active filter chips
    const activeChips = useMemo(() => {
        const chips = [];
        if (selectedCategory && selectedCategory !== 'All') {
            chips.push({
                key: 'category',
                label: 'Category',
                value: selectedCategory,
                displayValue: selectedCategory.replace(/^\d+\.\s*/, ''),
                onRemove: () => setSelectedCategory('All'),
            });
        }
        if (statusFilter && statusFilter !== 'all') {
            chips.push({
                key: 'status',
                label: 'Status',
                value: statusFilter,
                displayValue: statusFilter === 'enabled' ? 'Enabled Only' : 'Disabled Only',
                onRemove: () => setStatusFilter('all'),
            });
        }
        if (searchQuery) {
            chips.push({
                key: 'search',
                label: 'Search',
                value: searchQuery,
                displayValue: `"${searchQuery}"`,
                onRemove: () => setSearchQuery(''),
            });
        }
        return chips;
    }, [selectedCategory, statusFilter, searchQuery]);

    if (isLoadingAll || isLoadingUser) {
        return (
            <div className="w-full flex-1 flex flex-col bg-gray-50/40 min-h-screen">
                <Header
                    showBack={true}
                    onBack={onBack}
                    title={`Permissions: ${user?.name || 'User'}`}
                    breadcrumbs={[
                        { label: "User Management", path: "/user-management" },
                        { label: "Roles & Permissions" },
                        { label: "Permissions" },
                    ]}
                />
                <div className="flex-1 flex items-center justify-center py-20">
                    <Loader />
                </div>
            </div>
        );
    }

    if (errorAll || errorUser) {
        return (
            <div className="w-full flex-1 flex flex-col bg-gray-50/40 min-h-screen">
                <Header
                    showBack={true}
                    onBack={onBack}
                    title={`Permissions: ${user?.name || 'User'}`}
                    breadcrumbs={[
                        { label: "User Management", path: "/user-management" },
                        { label: "Roles & Permissions" },
                        { label: "Permissions" },
                    ]}
                />
                <div className="p-8 text-center">
                    <p className="text-red-500 font-bold mb-3">Error loading permissions data.</p>
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-semibold cursor-pointer"
                    >
                        Back to Roles & Permissions
                    </button>
                </div>
            </div>
        );
    }

    const totalFilteredItems = Object.values(filteredGroupedPermissions).reduce((acc, list) => acc + list.length, 0);

    return (
        <div className="w-full flex-1 flex flex-col bg-gray-50/40 min-h-screen">
            {/* ── TOP HEADER (Permissions for {name} with Back button, Badges & Save button) ── */}
            <Header
                showBack={true}
                onBack={onBack}
                title={
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">
                            Permissions for {user.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                            <ShieldCheck size={13} />
                            {user.role?.toUpperCase()}
                        </span>
                        {user.department && (
                            <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {user.department}
                            </span>
                        )}
                    </div>
                }
                subtitle="Toggle access on or off for each system page and choose specific permissions."
                breadcrumbs={[
                    { label: "User Management", path: "/user-management" },
                    { label: "Roles & Permissions" },
                    { label: `Permissions: ${user.name}` },
                ]}
                actions={
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isUpdating}
                        className="h-9 sm:h-10 px-3.5 sm:px-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        title="Save Permissions"
                    >
                        <Save size={16} />
                        <span>{isUpdating ? 'Saving...' : 'Save Permissions'}</span>
                    </button>
                }
            />

            {/* ── MAIN CONTENT CONTAINER ── */}
            <div className="p-3 sm:p-5 lg:p-6 w-full space-y-4 sm:space-y-5 pb-24 md:pb-8">
                {/* ── CONTROLS BAR: Search on Left (Opposite), Filters on Right ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">
                    {/* Search Input on Left (Opposite) */}
                    <div className="relative flex-1 max-w-full md:max-w-md">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search permissions..."
                            className="w-full pl-9 pr-8 h-10 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 hover:bg-white text-slate-800 placeholder-slate-400 transition shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filters on Right */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                        {/* Module Category Filter Dropdown */}
                        <SelectDropdown
                            value={selectedCategory}
                            onChange={(val) => setSelectedCategory(val || "All")}
                            options={categoryOptions}
                            className="w-full sm:w-56"
                            buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-bold transition hover:border-orange-400 shadow-2xs cursor-pointer"
                        />

                        {/* Status Filter Dropdown */}
                        <SelectDropdown
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val || "all")}
                            options={statusOptions}
                            className="w-full sm:w-36"
                            buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-bold transition hover:border-orange-400 shadow-2xs cursor-pointer"
                        />
                    </div>
                </div>

                {/* Active Filter Chips */}
                {activeChips.length > 0 && (
                    <ActiveFilterChips
                        chips={activeChips}
                        onClearAll={() => {
                            setSelectedCategory('All');
                            setStatusFilter('all');
                            setSearchQuery('');
                        }}
                    />
                )}

                {/* Zero State if search/filter has no results */}
                {totalFilteredItems === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
                        <p className="text-sm font-bold text-slate-700">No matching permissions found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or category filter</p>
                        <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setStatusFilter('all'); }}
                            className="mt-3 text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                        >
                            Reset all filters
                        </button>
                    </div>
                )}

                {/* ── TABULAR PERMISSION MATRIX ── */}
                {totalFilteredItems > 0 && (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            {/* Sticky Table Header */}
                            <thead className="bg-slate-50/95 border-b border-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider sticky top-0 z-20 backdrop-blur-xs">
                                <tr>
                                    <th className="py-3.5 px-4 text-left min-w-[280px]">
                                        Module / Feature
                                    </th>
                                    <th className="py-3.5 px-2 text-center w-20 min-w-[75px]" title="Toggle all permissions for this row">
                                        All
                                    </th>
                                    {ACTIONS.map(act => (
                                        <th
                                            key={act.key}
                                            className="py-3.5 px-2 text-center w-20 min-w-[70px]"
                                        >
                                            {act.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Table Body with Category Groupings */}
                            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                                {Object.entries(filteredGroupedPermissions).map(([category, items]) => {
                                    const cleanCategoryName = category.replace(/^\d+\.\s*/, '');
                                    const isCollapsed = Boolean(collapsedCategories[category]);

                                    return (
                                        <React.Fragment key={category}>
                                            {/* Category Section Header Row */}
                                            <tr className="bg-slate-50/95 border-y border-slate-200/90 sticky top-[41px] z-10 backdrop-blur-xs select-none">
                                                <td colSpan={7} className="py-2.5 px-4">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        {/* Category Title & Collapse Toggle */}
                                                        <div
                                                            onClick={() => toggleCategoryCollapse(category)}
                                                            className="flex items-center gap-2 cursor-pointer group"
                                                        >
                                                            <button
                                                                type="button"
                                                                className="text-slate-400 group-hover:text-orange-600 transition-colors p-0.5"
                                                            >
                                                                {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                                            </button>
                                                            <span className="w-1.5 h-3.5 rounded-full bg-orange-500 shrink-0"></span>
                                                            <span className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-wide group-hover:text-orange-600 transition-colors">
                                                                {cleanCategoryName}
                                                            </span>
                                                        </div>

                                                        {/* Quick Category Action Links */}
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCategoryToggleAll(items, true);
                                                                }}
                                                                className="font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                                                            >
                                                                Grant All
                                                            </button>
                                                            <span className="text-slate-300">|</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCategoryToggleAll(items, false);
                                                                }}
                                                                className="font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                                                            >
                                                                Revoke All
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Category Feature Rows (Hidden if category is collapsed) */}
                                            {!isCollapsed && items.map(({ feature: featureName, displayName, description, access: itemAccess }) => {
                                                const availableTypes = itemAccess || allAccessTypes;
                                                const featurePermission = permissions.find(p => p.feature === featureName);
                                                const grantedActions = featurePermission?.access || [];
                                                const isRowFullyGranted = availableTypes.length > 0 && availableTypes.every(t => grantedActions.includes(t));
                                                const isRowPartiallyGranted = grantedActions.length > 0 && !isRowFullyGranted;
                                                const hasAnyAccess = grantedActions.length > 0;

                                                return (
                                                    <tr
                                                        key={featureName}
                                                        className={`border-b border-slate-100 hover:bg-orange-50/30 transition-colors group ${
                                                            hasAnyAccess ? 'bg-white' : 'bg-slate-50/20'
                                                        }`}
                                                    >
                                                        {/* 1. Module Name & Description */}
                                                        <td className="py-3 px-4 align-middle">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-bold text-gray-900 text-xs sm:text-sm">
                                                                        {displayName}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                                                        {featureName}
                                                                    </span>
                                                                </div>
                                                                {description && (
                                                                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 leading-relaxed" title={description}>
                                                                        {description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* 2. Select All Checkbox for this row */}
                                                        <td className="py-3 px-2 text-center align-middle">
                                                            <label
                                                                className="inline-flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-orange-100/50 transition"
                                                                title={isRowFullyGranted ? 'Revoke all permissions for this module' : 'Grant all permissions for this module'}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isRowFullyGranted}
                                                                    ref={(el) => {
                                                                        if (el) el.indeterminate = isRowPartiallyGranted;
                                                                    }}
                                                                    onChange={() => handleRowToggleAll(featureName, availableTypes)}
                                                                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 accent-orange-500 cursor-pointer"
                                                                />
                                                            </label>
                                                        </td>

                                                        {/* 3-7. Individual Action Checkboxes: read, create, update, delete, execute */}
                                                        {ACTIONS.map(act => {
                                                            const isAvailable = availableTypes.includes(act.key);
                                                            const isChecked = grantedActions.includes(act.key);

                                                            return (
                                                                <td
                                                                    key={act.key}
                                                                    className="py-3 px-2 text-center align-middle"
                                                                >
                                                                    {isAvailable ? (
                                                                        <label
                                                                            className="inline-flex items-center justify-center p-1 cursor-pointer rounded-lg hover:bg-orange-100/50 transition"
                                                                            title={`${act.label} permission for ${displayName}`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => handleActionToggle(featureName, act.key)}
                                                                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 accent-orange-500 cursor-pointer"
                                                                            />
                                                                        </label>
                                                                    ) : (
                                                                        <span
                                                                            className="inline-block text-gray-300 font-bold select-none text-xs"
                                                                        >
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mobile Sticky Save Footer Bar */}
            <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-2xl flex items-center justify-end z-40 sm:hidden">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-orange-500 rounded-xl hover:bg-orange-600 disabled:bg-orange-300 transition-all shadow-md cursor-pointer active:scale-95"
                >
                    <Save size={15} />
                    {isUpdating ? 'Saving...' : 'Save Permissions'}
                </button>
            </div>
        </div>
    );
};

export default GlobalPermissionMatrix;
