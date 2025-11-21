# 📋 แผนการ Redesign หน้า API Management
## อิงตาม Design Pattern ของ UserManagement.js

---

## 🎯 เป้าหมาย
- ปรับรูปแบบใหม่ทั้งหมดให้สอดคล้องกับ UserManagement.js
- ใช้ components แยก (FilterBar, BulkActionBar)
- ใช้ CSS classes มาตรฐาน (umx-*, amx-*)
- ใช้ Design System ที่มีอยู่แล้ว

---

## 📐 โครงสร้าง Components

### 1. **ApiManagement.js** (Main Component)
```
- Header Section (เหมือน UserManagement)
- FilterBar Component (แยกออกมา)
- BulkActionBar Component (แยกออกมา)
- Table/View Section
- Modals & Drawers
```

### 2. **ApiFilterBar.js** (New Component)
```
- Search Input (เหมือน FilterBar.js)
- Quick Filters (Status, Usage, Permissions)
- Date Range Filter
- Active Filter Tags
- Clear All Filters Button
```

### 3. **ApiBulkActionBar.js** (New Component)
```
- Selected Count Display
- Bulk Activate
- Bulk Deactivate
- Bulk Delete
- Bulk Export (optional)
```

### 4. **ApiManagement.css** (New CSS File)
```
- ใช้ CSS Variables เหมือน UserManagement.css
- ใช้ Typography Scale (amx-text-h1, h2, h3)
- ใช้ Color Tokens
- ใช้ Shadow System
- ใช้ Border Radius System
```

---

## 🎨 Design System (อิงตาม UserManagement)

### Color Tokens
```css
--color-primary: #2563eb;
--color-primary-light: #3b82f6;
--color-primary-dark: #1e40af;
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-text-primary: #0f172a;
--color-text-secondary: #475569;
--color-border: #e2e8f0;
```

### Typography Scale
```css
.amx-text-h1 { font-size: 32px; font-weight: 700; }
.amx-text-h2 { font-size: 24px; font-weight: 600; }
.amx-text-h3 { font-size: 20px; font-weight: 600; }
```

### CSS Classes Naming
```
amx-* (API Management eXtended)
- amx-header
- amx-filter-bar
- amx-table
- amx-card
- amx-button-primary
```

---

## 🔧 ฟังก์ชันหลัก

### Phase 1: Core Structure
1. ✅ แยก FilterBar Component
2. ✅ แยก BulkActionBar Component
3. ✅ ปรับ Header ให้เหมือน UserManagement
4. ✅ ใช้ CSS Classes มาตรฐาน
5. ✅ ปรับ Table Layout

### Phase 2: Features
1. ✅ Search & Filtering
2. ✅ Bulk Operations
3. ✅ View Modes (Table only - เหมือน UserManagement)
4. ✅ Key Display (Prefix, Masked, Copy)
5. ✅ Status Indicators
6. ✅ Quick Actions (Edit, Delete, View)

### Phase 3: Modals & Drawers
1. ✅ Create API Key Modal
2. ✅ Edit API Key Modal
3. ✅ Details Drawer (เหมือน UserDetails Drawer)
4. ✅ Usage Statistics Drawer
5. ✅ Request Logs Drawer

### Phase 4: Advanced Features
1. ✅ Usage Analytics
2. ✅ Security Settings (IP Whitelist, Rate Limits)
3. ✅ Activity Timeline
4. ✅ Export/Import

---

## 📝 Component Structure

### ApiManagement.js
```javascript
// Imports (เหมือน UserManagement)
import FilterBar from './ApiFilterBar';
import BulkActionBar from './ApiBulkActionBar';
import './ApiManagement.css';

// State Management
- apiKeys, loading, error
- searchText, filters
- selectedRowKeys
- modals & drawers states

// Functions
- fetchApiKeys()
- handleCreate()
- handleEdit()
- handleDelete()
- handleBulkActions()
- renderTable()
- renderModals()
```

### ApiFilterBar.js
```javascript
// Props
- searchText, onSearchChange
- statusFilter, onStatusFilterChange
- usageFilter, onUsageFilterChange
- dateRangeFilter, onDateRangeChange
- activeFilterTags, onFilterTagClose
- onClearAllFilters

// Render
- Search Input (เหมือน FilterBar.js)
- Quick Filter Selects
- Active Filter Tags
- Clear All Button
```

### ApiBulkActionBar.js
```javascript
// Props
- selectedCount
- onBulkActivate
- onBulkDeactivate
- onBulkDelete
- loading

// Render
- Selected Count
- Action Buttons
- Confirmation Modals
```

---

## 🎯 Implementation Steps

### Step 1: สร้าง Components ใหม่
1. สร้าง `ApiFilterBar.js`
2. สร้าง `ApiBulkActionBar.js`
3. สร้าง `ApiManagement.css`

### Step 2: Refactor ApiManagement.js
1. ลบ inline styles
2. ใช้ CSS classes
3. แยก FilterBar และ BulkActionBar
4. ปรับ Header ให้เหมือน UserManagement

### Step 3: ปรับ Table
1. ใช้ columns definition
2. ใช้ rowSelection
3. ใช้ pagination
4. ใช้ loading states

### Step 4: ปรับ Modals & Drawers
1. ใช้ standard Ant Design components
2. ใช้ CSS classes
3. ปรับ layout ให้เหมือน UserManagement

---

## 📊 Comparison Table

| Feature | UserManagement | ApiManagement (New) |
|---------|---------------|---------------------|
| FilterBar | ✅ Separate Component | ✅ Separate Component |
| BulkActionBar | ✅ Separate Component | ✅ Separate Component |
| CSS Classes | ✅ umx-* | ✅ amx-* |
| Header Style | ✅ Modern Compact | ✅ Modern Compact |
| Table Style | ✅ Standard Ant Design | ✅ Standard Ant Design |
| Color System | ✅ CSS Variables | ✅ CSS Variables |
| Typography | ✅ Scale System | ✅ Scale System |

---

## ✅ Checklist

- [ ] สร้าง ApiFilterBar.js
- [ ] สร้าง ApiBulkActionBar.js
- [ ] สร้าง ApiManagement.css
- [ ] Refactor ApiManagement.js
- [ ] ปรับ Header
- [ ] ปรับ Table
- [ ] ปรับ Modals
- [ ] ปรับ Drawers
- [ ] Test All Features
- [ ] Remove Old Code

---

## 🚀 Next Steps

1. เริ่มจากสร้าง Components ใหม่
2. Refactor ApiManagement.js ทีละส่วน
3. Test และปรับปรุง
4. Remove code ที่ไม่ใช้

