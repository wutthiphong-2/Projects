import React from 'react';
import { Row, Col, Input, Select, TreeSelect, Button, Space, Tag, Typography, List, Tooltip, Divider } from 'antd';
import { SearchOutlined, BankOutlined, GlobalOutlined, ClearOutlined, FilterOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

/**
 * FilterBar Component
 * Unified control bar for search, OU filters, and quick filters
 */
const FilterBar = ({
  // Search
  searchText,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  searchPlaceholder = "ค้นหาด้วยชื่อ / Username / Email",
  
  // OU Modal
  onOpenOuModal,
  
  // Quick Filters
  departmentFilter,
  statusFilter,
  onDepartmentFilterChange,
  onStatusFilterChange,
  departments = [],
  
  // Active Filters
  activeFilterTags = [],
  onFilterTagClose,
  onClearAllFilters,
  
  // Search Suggestions
  showSearchSuggestions = false,
  searchSuggestions = [],
  onSuggestionClick,
  
  // Layout
  compact = false,
  isFilterSticky = false
}) => {
  // Ensure handlers are functions
  const handleSearchChange = (value) => {
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleSearchFocus = () => {
    if (onSearchFocus) {
      onSearchFocus();
    }
  };

  const handleSearchBlur = () => {
    if (onSearchBlur) {
      onSearchBlur();
    }
  };

  const handleOpenOuModal = () => {
    if (onOpenOuModal) {
      onOpenOuModal();
    }
  };

  return (
    <div className={`umx-filter-wrapper ${isFilterSticky ? 'umx-filter-sticky' : ''}`}>
      <div className="umx-filter-bar-compact">
        <Row gutter={16} align="top">
          {/* Search Section */}
          <Col flex="auto">
            <div style={{ position: 'relative' }}>
              <div style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>ค้นหา</Text>
              </div>
              <Input
                placeholder={searchPlaceholder}
                prefix={<SearchOutlined style={{ fontSize: 14, color: '#9ca3af' }} />}
                allowClear
                value={searchText || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                size="middle"
                className="umx-search-input-modern"
              />
              {/* Search Suggestions */}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="umx-search-suggestions">
                  <List
                    size="small"
                    dataSource={searchSuggestions}
                    renderItem={(item) => (
                      <List.Item
                        style={{ cursor: 'pointer', padding: '8px 12px' }}
                        onClick={() => onSuggestionClick && onSuggestionClick(item)}
                      >
                        <Space size={8}>
                          {item.icon}
                          <Text style={{ fontSize: 13 }}>{item.label}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </div>
          </Col>
          
          {/* Quick Filters Section */}
          <Col flex="none">
            <div>
              <div style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>ตัวกรองด่วน</Text>
              </div>
              <Space size={8} align="center">
                <Select
                  placeholder="แผนก"
                  allowClear
                  value={departmentFilter || undefined}
                  onChange={onDepartmentFilterChange}
                  size="middle"
                  style={{ width: 160 }}
                  suffixIcon={<FilterOutlined style={{ fontSize: 12, color: '#9ca3af' }} />}
                  className="umx-filter-select-modern"
                >
                  {departments.map((dept) => (
                    <Option key={dept} value={dept}>{dept}</Option>
                  ))}
                </Select>
                <Select
                  value={statusFilter}
                  onChange={onStatusFilterChange}
                  size="middle"
                  style={{ width: 130 }}
                  className="umx-filter-select-modern"
                >
                  <Option value="all">ทั้งหมด</Option>
                  <Option value="enabled">Active</Option>
                  <Option value="disabled">Disabled</Option>
                </Select>
              </Space>
            </div>
          </Col>
          
          {/* OU Filters Section */}
          <Col flex="none">
            <div>
              <div style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>OU</Text>
              </div>
              <Button
                type="default"
                size="middle"
                icon={<BankOutlined />}
                onClick={handleOpenOuModal}
                className="umx-ou-button-modern"
              >
                เลือก OU
              </Button>
            </div>
          </Col>
        </Row>
        
        {/* Active Filters Tags & Clear Button */}
        {(activeFilterTags.length > 0 || searchText || departmentFilter || statusFilter !== 'all') && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <Row justify="space-between" align="middle">
              <Col>
                {activeFilterTags.length > 0 && (
                  <Space size={8} wrap>
                    {activeFilterTags.map((tag) => (
                      <Tag
                        key={tag.key}
                        closable
                        onClose={(e) => {
                          e.preventDefault();
                          onFilterTagClose(tag.key);
                        }}
                        style={{ 
                          fontSize: 13, 
                          margin: 0, 
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: 'none',
                          background: '#eff6ff',
                          color: '#1e40af',
                          fontWeight: 500
                        }}
                      >
                        {tag.label}
                      </Tag>
                    ))}
                  </Space>
                )}
              </Col>
              <Col>
                <Button
                  type="text"
                  danger
                  size="middle"
                  icon={<ClearOutlined />}
                  onClick={onClearAllFilters}
                  style={{ fontWeight: 500 }}
                >
                  ล้างตัวกรองทั้งหมด
                </Button>
              </Col>
            </Row>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;

