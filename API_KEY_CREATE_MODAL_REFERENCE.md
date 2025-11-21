# 📋 ข้อมูลอ้างอิงสำหรับ Create API Key Modal
## จาก Components อื่นๆ ในระบบ

---

## 🎯 รูปแบบที่ใช้ในระบบ

### 1. **UserManagement.js** - Create User Modal
- **รูปแบบ**: Steps/Wizard (3 Steps)
- **Structure**:
  ```
  Modal
    ├── Title (with icon + step indicator)
    ├── Steps Component (Progress indicator)
    ├── Form (Single form, multiple steps)
    │   ├── Step 1: Account Information (Cards with sections)
    │   ├── Step 2: Groups (Group selection)
    │   └── Step 3: Review (Summary)
    └── Footer (Back/Next/Create buttons)
  ```

- **Features**:
  - ✅ Steps/Wizard navigation
  - ✅ Cards for grouping fields
  - ✅ Collapse panels for optional sections
  - ✅ Tooltips for help text
  - ✅ Required/Optional tags
  - ✅ Responsive width

### 2. **GroupManagement.js** - Create Group Modal
- **รูปแบบ**: Single Form Modal
- **Structure**:
  ```
  Modal
    ├── Title (with icon + subtitle)
    ├── Form (Vertical layout)
    │   ├── Group Name (Required)
    │   ├── Group Type (Radio/Select)
    │   ├── Group Scope (Radio/Select)
    │   ├── Description (Optional)
    │   └── OU Selection (TreeSelect)
    └── Footer (Create/Cancel buttons)
  ```

- **Features**:
  - ✅ Simple single form
  - ✅ Icon in title
  - ✅ Subtitle text
  - ✅ Vertical form layout
  - ✅ Required field validation
  - ✅ Default values

---

## 📝 ข้อมูลที่จำเป็นสำหรับ Create API Key

### Required Fields
1. **Name** (`name: str`) - ชื่อ API Key

### Optional Fields
2. **Description** (`description: Optional[str]`)
3. **Permissions** (`permissions: Optional[List[str]]`) - Endpoints ที่อนุญาต
4. **Rate Limit** (`rate_limit: int`) - Default: 100, Range: 1-10000
5. **Expiration Date** (`expires_at: Optional[datetime]`)
6. **IP Whitelist** (`ip_whitelist: Optional[List[str]]`)

### Quick Templates
- Full Access
- Read Only
- Development
- Production

---

## 🎨 Design Pattern ที่ควรใช้

### Option 1: Simple Form (เหมือน GroupManagement)
```
Modal
  ├── Title: "Create New API Key" (with KeyOutlined icon)
  ├── Quick Templates Section (Card)
  │   └── Template Buttons (Full Access, Read Only, Development, Production)
  ├── Form (Vertical layout)
  │   ├── Name (Required, with tooltip)
  │   ├── Description (Optional, TextArea)
  │   ├── Rate Limit (Number input, with tooltip)
  │   ├── Expiration Date (DatePicker, optional)
  │   ├── Permissions (Multi-select, with tooltip)
  │   └── IP Whitelist (TextArea, one per line)
  └── Footer (Create/Cancel)
```

### Option 2: Steps/Wizard (เหมือน UserManagement)
```
Modal
  ├── Title: "Create New API Key" (with step indicator)
  ├── Steps Component
  │   ├── Step 1: Basic Info
  │   ├── Step 2: Security Settings
  │   └── Step 3: Review
  ├── Form (Single form, multiple steps)
  │   ├── Step 1: Name, Description, Rate Limit
  │   ├── Step 2: Permissions, IP Whitelist, Expiration
  │   └── Step 3: Summary/Review
  └── Footer (Back/Next/Create)
```

---

## 💡 แนะนำ: ใช้ Simple Form (Option 1)

**เหตุผล**:
- API Key มี fields ไม่มาก
- ไม่ซับซ้อนเหมือน Create User
- ใช้งานง่ายกว่า
- ตรงกับ GroupManagement pattern

---

## 📋 Structure ที่แนะนำ

```javascript
<Modal
  title={
    <Space>
      <KeyOutlined />
      <span>Create New API Key</span>
    </Space>
  }
  open={isCreateModalVisible}
  onCancel={() => setIsCreateModalVisible(false)}
  footer={null}
  width={700}
>
  {/* Quick Templates */}
  <Card size="small" title="Quick Templates">
    <Space wrap>
      {templates.map(template => (
        <Button onClick={() => applyTemplate(template)}>
          {template.name}
        </Button>
      ))}
    </Space>
    <Text type="secondary" style={{ fontSize: 12 }}>
      Click a template to auto-fill the form
    </Text>
  </Card>

  {/* Form */}
  <Form form={form} layout="vertical" onFinish={handleCreate}>
    {/* Name - Required */}
    <Form.Item
      name="name"
      label={
        <Space>
          <Text strong>Name</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>(Required)</Text>
        </Space>
      }
      rules={[{ required: true, message: 'Please enter API key name' }]}
    >
      <Input placeholder="e.g., Production API Key" />
    </Form.Item>

    {/* Description - Optional */}
    <Form.Item
      name="description"
      label="Description"
      tooltip="Optional description for this API key"
    >
      <TextArea rows={3} placeholder="Describe what this API key will be used for..." />
    </Form.Item>

    {/* Rate Limit & Expiration */}
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          name="rate_limit"
          label="Rate Limit"
          initialValue={100}
          rules={[
            { required: true },
            { type: 'number', min: 1, max: 10000 }
          ]}
        >
          <InputNumber min={1} max={10000} addonAfter="req/min" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="expires_at"
          label="Expiration Date"
        >
          <DatePicker
            style={{ width: '100%' }}
            showTime
            placeholder="No expiration"
          />
        </Form.Item>
      </Col>
    </Row>

    {/* Permissions */}
    <Form.Item
      name="permissions"
      label="Permissions"
      tooltip="Select specific endpoints. Leave empty for all endpoints."
    >
      <Select
        mode="multiple"
        placeholder="Select endpoints (leave empty for all)"
        options={availableEndpoints}
      />
    </Form.Item>

    {/* IP Whitelist */}
    <Form.Item
      name="ip_whitelist"
      label="IP Whitelist"
      tooltip="One IP address per line. Leave empty to allow all IPs."
    >
      <TextArea
        rows={4}
        placeholder="192.168.1.1&#10;10.0.0.1"
      />
    </Form.Item>

    {/* Form Actions */}
    <Form.Item>
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button onClick={() => setIsCreateModalVisible(false)}>
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
          Create API Key
        </Button>
      </Space>
    </Form.Item>
  </Form>
</Modal>
```

---

## ✅ Checklist

- [ ] Modal Title with icon
- [ ] Quick Templates section (Card)
- [ ] Form with vertical layout
- [ ] Required field indicators
- [ ] Tooltips for help text
- [ ] Default values (rate_limit: 100)
- [ ] Validation rules
- [ ] Responsive design
- [ ] Clean footer buttons

---

## 🎨 CSS Classes ที่ควรใช้

```css
/* ตาม design pattern ของ UserManagement */
.amx-modal-title { }
.amx-form-item-label { }
.amx-template-card { }
.amx-form-section { }
```

