import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Tabs,
  Space,
  Tag,
  Button,
  Collapse,
  Descriptions,
  Alert,
  Empty,
  Spin,
  Divider,
  Select,
  Input
} from 'antd';
import {
  BookOutlined,
  CodeOutlined,
  CopyOutlined,
  CheckOutlined,
  ApiOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import api from '../../services/api';
import './APIManagement.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

const APIDocumentation = () => {
  const [codeExamples, setCodeExamples] = useState([]);
  const [quickStart, setQuickStart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('curl');
  const [copiedCode, setCopiedCode] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Fetch code examples
  const fetchCodeExamples = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/docs/code-examples');
      setCodeExamples(response.data || []);
    } catch (error) {
      console.error('Error fetching code examples:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch quick start
  const fetchQuickStart = async () => {
    try {
      const response = await api.get('/api/docs/quick-start');
      setQuickStart(response.data);
    } catch (error) {
      console.error('Error fetching quick start:', error);
    }
  };

  useEffect(() => {
    fetchCodeExamples();
    fetchQuickStart();
  }, []);

  // Copy code to clipboard
  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    message.success('คัดลอกแล้ว!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter examples by search
  const filteredExamples = codeExamples.filter(example => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      example.endpoint.toLowerCase().includes(searchLower) ||
      example.description.toLowerCase().includes(searchLower) ||
      example.method.toLowerCase().includes(searchLower)
    );
  });

  // Get base URL (from config or window location)
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const apiUrl = localStorage.getItem('API_URL') || 
                    window.__API_URL__ || 
                    process.env.REACT_APP_API_URL ||
                    'http://localhost:8000';
      return apiUrl;
    }
    return 'http://localhost:8000';
  };

  const baseUrl = getBaseUrl();

  return (
    <div className="api-documentation">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ 
          marginBottom: 8,
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '24px'
        }}>
          <BookOutlined /> API Documentation
        </Title>
        <Paragraph type="secondary" style={{ fontSize: '14px' }}>
          เอกสารและตัวอย่างการใช้งาน API สำหรับการจัดการ Active Directory
        </Paragraph>
      </div>

      {/* Quick Start Guide */}
      {quickStart && (
        <Card
          title={
            <Space>
              <RocketOutlined />
              <span>Quick Start Guide</span>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {quickStart.steps?.map((step, index) => (
              <div key={index}>
                <Title level={4}>
                  <Tag color="blue">{step.step}</Tag> {step.title}
                </Title>
                <Paragraph>{step.description}</Paragraph>
                {step.code && (
                  <div style={{ position: 'relative' }}>
                    <pre style={{
                      background: '#f5f5f5',
                      padding: 16,
                      borderRadius: 4,
                      overflow: 'auto',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}>
                      <code>{step.code}</code>
                    </pre>
                    <Button
                      type="text"
                      icon={copiedCode === `quick-${index}` ? <CheckOutlined /> : <CopyOutlined />}
                      onClick={() => handleCopy(step.code, `quick-${index}`)}
                      style={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  </div>
                )}
              </div>
            ))}

            <Divider />

            <div>
              <Title level={5}>Base URL:</Title>
              <Text code>{baseUrl}</Text>
            </div>

            <div>
              <Title level={5}>Authentication:</Title>
              <Text>{quickStart.authentication?.type}</Text>
              <div style={{ marginTop: 8 }}>
                <Text code>{quickStart.authentication?.header}</Text>
              </div>
            </div>

            <div>
              <Title level={5}>Rate Limits:</Title>
              <Text>{quickStart.rate_limits?.default}</Text>
              <ul style={{ marginTop: 8 }}>
                {quickStart.rate_limits?.headers?.map((header, idx) => (
                  <li key={idx}><Text code>{header}</Text></li>
                ))}
              </ul>
            </div>
          </Space>
        </Card>
      )}

      {/* Code Examples */}
      <Card
        title={
          <Space>
            <CodeOutlined />
            <span>Code Examples</span>
          </Space>
        }
        extra={
          <Space>
            <Search
              placeholder="ค้นหา endpoint..."
              allowClear
              style={{ width: 250 }}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              style={{ width: 120 }}
            >
              <Option value="all">ทั้งหมด</Option>
              <Option value="curl">cURL</Option>
              <Option value="python">Python</Option>
              <Option value="javascript">JavaScript</Option>
            </Select>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : filteredExamples.length === 0 ? (
          <Empty description="ไม่พบตัวอย่างโค้ด" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {filteredExamples.map((example, idx) => {
              // Filter examples by language
              let examplesToShow = example.examples || [];
              if (selectedLanguage !== 'all') {
                examplesToShow = examplesToShow.filter(ex => ex.language === selectedLanguage);
              }

              if (examplesToShow.length === 0) return null;

              return (
                <Card
                  key={idx}
                  size="small"
                  style={{ background: '#fafafa' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Tag color={example.method === 'GET' ? 'blue' : example.method === 'POST' ? 'green' : 'orange'}>
                          {example.method}
                        </Tag>
                        <Text code style={{ fontSize: '14px' }}>{example.endpoint}</Text>
                      </Space>
                    </div>

                    <Paragraph type="secondary" style={{ margin: 0 }}>
                      {example.description}
                    </Paragraph>

                    <Collapse
                      items={examplesToShow.map((ex, exIdx) => ({
                        key: exIdx,
                        label: (
                          <Space>
                            <FileTextOutlined />
                            <span>{ex.label}</span>
                            {ex.description && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                - {ex.description}
                              </Text>
                            )}
                          </Space>
                        ),
                        children: (
                          <div style={{ position: 'relative' }}>
                            <pre style={{
                              background: '#1e1e1e',
                              color: '#d4d4d4',
                              padding: 16,
                              borderRadius: 4,
                              overflow: 'auto',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                              margin: 0
                            }}>
                              <code>{ex.code.replace(/\{base_url\}/g, baseUrl)}</code>
                            </pre>
                            <Button
                              type="text"
                              icon={copiedCode === `${idx}-${exIdx}` ? <CheckOutlined /> : <CopyOutlined />}
                              onClick={() => handleCopy(ex.code.replace(/\{base_url\}/g, baseUrl), `${idx}-${exIdx}`)}
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                color: '#fff'
                              }}
                            />
                          </div>
                        )
                      }))}
                    />
                  </Space>
                </Card>
              );
            })}
          </Space>
        )}
      </Card>

      {/* API Endpoints Info */}
      <Card
        title={
          <Space>
            <ApiOutlined />
            <span>Available Endpoints</span>
          </Space>
        }
        style={{ marginTop: 24 }}
      >
        <Alert
          message="API Endpoints"
          description={
            <div>
              <Paragraph>
                API ของเรารองรับ endpoints ต่อไปนี้:
              </Paragraph>
              <ul>
                <li><Text code>/api/users</Text> - จัดการผู้ใช้</li>
                <li><Text code>/api/groups</Text> - จัดการกลุ่ม</li>
                <li><Text code>/api/ous</Text> - จัดการ Organizational Units</li>
                <li><Text code>/api/activity-logs</Text> - ดู Activity Logs</li>
                <li><Text code>/api/api-keys</Text> - จัดการ API Keys</li>
              </ul>
              <Paragraph style={{ marginTop: 16 }}>
                <InfoCircleOutlined /> สำหรับรายละเอียดเพิ่มเติม กรุณาดูที่{' '}
                <a href={`${baseUrl}/docs`} target="_blank" rel="noopener noreferrer">
                  Swagger UI Documentation
                </a>
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default APIDocumentation;

