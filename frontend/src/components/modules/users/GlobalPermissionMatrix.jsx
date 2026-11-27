import React, { useState, useEffect, useMemo } from 'react';
import { useGetAllPossiblePermissionsQuery, useGetUserPermissionsQuery, useUpdateUserPermissionsMutation } from '../../../redux/api/authApi';
import { Save, ShieldCheck, Search, X } from 'lucide-react';
import Loader from '../../shared/loader/Loader';
import Header from '../../shared/sidebar/Header';
import SelectDropdown from '../../shared/form-fields/SelectDropdown';
import ActiveFilterChips from '../../shared/search-export/ActiveFilterChips';
import { toast } from 'react-toastify';

const ACTION_DISPLAY_MAP = {
    read: { label: 'View', desc: 'Can view page data' },
    create: { label: 'Create / Add', desc: 'Can add new records' },
    update: { label: 'Edit / Update', desc: 'Can modify existing records' },
    delete: { label: 'Delete', desc: 'Can delete records' },
    execute: { label: 'Access / Run', desc: 'Can execute actions' },
};

const GlobalPermissionMatrix = ({ user, onBack }) => {
    const { data: allPermissionsData, isLoading: isLoadingAll, error: errorAll } = useGetAllPossiblePermissionsQuery();
    const { data: userPermissionsData, isLoading: isLoadingUser, error: errorUser } = useGetUserPermissionsQuery(user._id || user.id);
    const [updateUserPermissions, { isLoading: isUpdating }] = useUpdateUserPermissionsMutation();

    const [permissions, setPermissions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [statusFilter, setStatusFilter] = useState('all');

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
        return [...new Set(masterPermissions.flatMap(p => p.access))];
    }, [masterPermissions]);

    // Master toggle for a whole module (ON = grant default 'read' or all, OFF = revoke all actions)
    const handleMasterToggle = (featureName, availableTypes) => {
        setPermissions(current => {
            const copy = JSON.parse(JSON.stringify(current));
            let feature = copy.find(p => p.feature === featureName);
            const isCurrentlyActive = feature && feature.access && feature.access.length > 0;

            if (isCurrentlyActive) {
                // Turn OFF: revoke access completely
                feature.access = [];
            } else {
                // Turn ON: default to 'read' (view), or all available types if no 'read'
                const defaultAccess = availableTypes.includes('read') ? ['read'] : [...availableTypes];
                if (feature) {
                    feature.access = defaultAccess;
                } else {
                    copy.push({ feature: featureName, access: defaultAccess });
                }
            }
            return copy;
        });
    };

    // Toggle a single action (View, Create, Edit, Delete) for a module
    const handleActionToggle = (featureName, actionType, availableTypes) => {
        setPermissions(current => {
            const copy = JSON.parse(JSON.stringify(current));
            let feature = copy.find(p => p.feature === featureName);

            if (!feature) {
                feature = { feature: featureName, access: [actionType] };
                copy.push(feature);
            } else {
                const idx = feature.access.indexOf(actionType);
                if (idx > -1) {
                    feature.access.splice(idx, 1);
                } else {
                    feature.access.push(actionType);
                }
            }
            return copy;
        });
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

    // Categories list for filter tabs and dropdown
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

    // Metrics for display
    const totalActiveActions = useMemo(() => {
        return permissions.reduce((acc, p) => acc + (p.access?.length || 0), 0);
    }, [permissions]);

    const activeFeaturesCount = useMemo(() => {
        return permissions.filter(p => p.access && p.access.length > 0).length;
    }, [permissions]);

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
            {/* ── TOP HEADER (Permissions for {name} with Back button & Badges) ── */}
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
            <div className="p-3 sm:p-5 lg:p-6 w-full space-y-4 sm:space-y-6 pb-24 md:pb-8">
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

                {/* Modules Metric & Summary Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 px-1 gap-1">
                    <span>
                        Showing <strong>{totalFilteredItems}</strong> of {masterPermissions.length} modules
                    </span>
                    <span className="font-semibold text-orange-600">
                        {activeFeaturesCount} Modules Enabled ({totalActiveActions} actions configured)
                    </span>
                </div>

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

                {/* Permissions List Grouped By Category */}
                <div className="space-y-6">
                    {Object.entries(filteredGroupedPermissions).map(([category, items]) => {
                        const cleanCategoryName = category.replace(/^\d+\.\s*/, '');
                        const categoryActiveCount = items.filter(it => {
                            const p = permissions.find(x => x.feature === it.feature);
                            return p && p.access && p.access.length > 0;
                        }).length;

                        return (
                            <div key={category} className="space-y-2.5">
                                {/* Category Title Band */}
                                <div className="bg-slate-100/90 border-l-4 border-orange-500 px-3.5 py-2 rounded-r-xl flex items-center justify-between">
                                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                                        {cleanCategoryName}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        {categoryActiveCount} of {items.length} enabled
                                    </span>
                                </div>

                                {/* Permission Cards */}
                                <div className="space-y-2">
                                    {items.map(({ feature: featureName, displayName, description, access: itemAccess }) => {
                                        const availableTypes = itemAccess || allAccessTypes;
                                        const featurePermission = permissions.find(p => p.feature === featureName);
                                        const grantedActions = featurePermission?.access || [];
                                        const isEnabled = grantedActions.length > 0;

                                        return (
                                            <div
                                                key={featureName}
                                                className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-150 ${
                                                    isEnabled
                                                        ? 'bg-white border-orange-200 shadow-xs'
                                                        : 'bg-slate-50/50 border-slate-200/80 hover:bg-white'
                                                }`}
                                            >
                                                {/* Header Row: Title, Code, Description & Master Switch */}
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-slate-900 text-sm sm:text-[15px]">
                                                                {displayName}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                {featureName}
                                                            </span>
                                                        </div>
                                                        {description && (
                                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                                                {description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Master Toggle Switch */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`text-xs font-semibold hidden sm:inline ${isEnabled ? 'text-orange-600' : 'text-slate-400'}`}>
                                                            {isEnabled ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={isEnabled}
                                                            onClick={() => handleMasterToggle(featureName, availableTypes)}
                                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                                isEnabled ? 'bg-orange-500' : 'bg-slate-300'
                                                            }`}
                                                            title={isEnabled ? 'Click to disable access' : 'Click to enable access'}
                                                        >
                                                            <span
                                                                aria-hidden="true"
                                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                                                                }`}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Sub-actions Checkboxes (Shown when module has 2+ actions and is enabled) */}
                                                {availableTypes.length > 1 && isEnabled && (
                                                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                            Permissions:
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {availableTypes.map(actionType => {
                                                                const isChecked = grantedActions.includes(actionType);
                                                                const meta = ACTION_DISPLAY_MAP[actionType] || { label: actionType };

                                                                return (
                                                                    <label
                                                                        key={actionType}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            handleActionToggle(featureName, actionType, availableTypes);
                                                                        }}
                                                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-all ${
                                                                            isChecked
                                                                                ? 'bg-orange-50 text-orange-900 border border-orange-300 font-bold shadow-2xs'
                                                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            readOnly
                                                                            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400 accent-orange-500 cursor-pointer"
                                                                        />
                                                                        <span>{meta.label}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Sticky Save Footer Bar */}
            <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-2xl flex items-center justify-between z-40 sm:hidden">
                <div className="min-w-0 pr-2">
                    <span className="text-xs font-extrabold text-slate-900 block truncate">
                        {activeFeaturesCount} Modules Enabled
                    </span>
                    <span className="text-[11px] text-slate-500">
                        {totalActiveActions} actions configured
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-orange-500 rounded-xl hover:bg-orange-600 disabled:bg-orange-300 transition-all shadow-md cursor-pointer active:scale-95 shrink-0"
                >
                    <Save size={15} />
                    {isUpdating ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
};

export default GlobalPermissionMatrix;
