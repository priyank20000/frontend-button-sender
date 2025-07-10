import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Typography, Space } from 'antd'
import {
  MessageOutlined,
  CheckCircleOutlined,
  MobileOutlined,
  FileTextOutlined,
  PlusOutlined,
  SendOutlined,
  ApiOutlined,
  RiseOutlined
} from '@ant-design/icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import StyledButton from '../components/common/StyledButton'
import LoadingSpinner from '../components/common/LoadingSpinner'
import api from '../services/api'

const { Title, Text } = Typography

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMessages: 1,
    connectedInstances: 2,
    totalInstances: 8,
    totalTemplates: 3
  })
  const [loading, setLoading] = useState(false)

  if (loading) {
    return (
      <LoadingSpinner 
        message="Loading dashboard..." 
        style={{ minHeight: '100vh', background: '#000000' }}
      />
    )
  }

  const chartData = [
    { date: '2025-06-01', messages: 800 },
    { date: '2025-06-02', messages: 900 },
    { date: '2025-06-03', messages: 1000 },
    { date: '2025-06-04', messages: 850 },
    { date: '2025-06-05', messages: 1000 },
    { date: '2025-06-06', messages: 1300 },
  ]

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.post('/user/statistics')
      if (response.data.status) {
        setStats(response.data.statistics)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon, color, suffix, trend, manage }) => (
    <Card 
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '8px',
        height: '140px'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ color, fontSize: '24px' }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {trend && (
            <span style={{ color: '#00ff88', fontSize: '12px', fontWeight: '500' }}>
              {trend}
            </span>
          )}
          {manage && (
            <span style={{ color: '#888888', fontSize: '12px' }}>
              Manage
            </span>
          )}
        </div>
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#888888', fontSize: '14px' }}>
          {title}
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ color: '#ffffff', fontSize: '32px', fontWeight: 'bold', lineHeight: '1' }}>
          {value}
        </span>
        <span style={{ color: '#888888', fontSize: '14px' }}>
          {suffix}
        </span>
      </div>
    </Card>
  )

  const QuickActionButton = ({ icon, title, onClick }) => (
    <StyledButton
      variant="ghost"
      onClick={onClick}
      style={{ 
        width: '100%',
        justifyContent: 'flex-start'
      }}
    >
      <Space>
        {icon}
        <span>{title}</span>
      </Space>
    </StyledButton>
  )

  return (
    <div style={{ background: '#000000', minHeight: '100vh', padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ color: '#ffffff', margin: 0, fontSize: '28px' }}>
          Dashboard Overview
        </Title>
        <Text style={{ color: '#888888', fontSize: '14px' }}>
          Monitor your WhatsApp messaging activity and performance
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Messages"
            value={stats.totalMessages}
            icon={<MessageOutlined />}
            color="#4a9eff"
            suffix="messages"
            trend="+12.3%"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Connected Instances"
            value={stats.connectedInstances}
            icon={<CheckCircleOutlined />}
            color="#00ff88"
            suffix={`of ${stats.totalInstances}`}
            manage="Active"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Instances"
            value={stats.totalInstances}
            icon={<MobileOutlined />}
            color="#4a9eff"
            suffix="devices"
            manage="Manage"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Templates"
            value={stats.totalTemplates}
            icon={<FileTextOutlined />}
            color="#8b5cf6"
            suffix="templates"
            manage="Manage"
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '8px'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ marginBottom: '24px' }}>
              <Title level={4} style={{ color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RiseOutlined />
                Message Activity
              </Title>
              <Text style={{ color: '#888888', fontSize: '14px' }}>
                Daily Message Volume
              </Text>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '3px', background: '#4a9eff', borderRadius: '2px' }}></div>
                <span style={{ color: '#888888', fontSize: '12px' }}>Messages Sent</span>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666666"
                  tick={{ fill: '#666666', fontSize: 12 }}
                  axisLine={{ stroke: '#1a1a1a' }}
                />
                <YAxis 
                  stroke="#666666"
                  tick={{ fill: '#666666', fontSize: 12 }}
                  axisLine={{ stroke: '#1a1a1a' }}
                  domain={[0, 1400]}
                  ticks={[0, 200, 400, 600, 800, 1000, 1200, 1400]}
                />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="#4a9eff"
                  strokeWidth={2}
                  dot={{ fill: '#4a9eff', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: '#4a9eff', strokeWidth: 2, fill: '#4a9eff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '8px'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ marginBottom: '24px' }}>
              <Title level={4} style={{ color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusOutlined />
                Quick Actions
              </Title>
            </div>
            
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <QuickActionButton
                icon={<FileTextOutlined />}
                title="Create Template"
                onClick={() => console.log('Create Template')}
              />
              <QuickActionButton
                icon={<SendOutlined />}
                title="Send Message"
                onClick={() => console.log('Send Message')}
              />
              <QuickActionButton
                icon={<ApiOutlined />}
                title="Add Device"
                onClick={() => console.log('Add Device')}
              />
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard