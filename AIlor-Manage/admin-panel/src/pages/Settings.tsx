import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Spin, Tabs, InputNumber, Divider } from 'antd';
import { SaveOutlined, ReloadOutlined, KeyOutlined, DollarOutlined } from '@ant-design/icons';
import api from '../api';

interface ApiConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  chatModel: string;
}

interface PriceConfig {
  generateImage: number;
  analyzeImage: number;
  chat: number;
}

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiForm] = Form.useForm();
  const [priceForm] = Form.useForm();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // 加载 API 配置
      const { data: apiData } = await api.get('/ai/config');
      if (apiData.success && apiData.data) {
        apiForm.setFieldsValue(apiData.data);
      }

      // 加载价格配置
      const { data: priceData } = await api.get('/coins/prices');
      if (priceData.success && priceData.data) {
        priceForm.setFieldsValue(priceData.data);
      }
    } catch (error: any) {
      message.error(error.message || '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveApiConfig = async (values: Partial<ApiConfig>) => {
    setSaving(true);
    try {
      const { data } = await api.post('/ai/config', values);
      if (data.success) {
        message.success('API 配置已保存');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const savePriceConfig = async (values: PriceConfig) => {
    setSaving(true);
    try {
      // 逐个保存价格配置
      await api.post('/coins/config', { key: 'generate_image_cost', value: values.generateImage });
      await api.post('/coins/config', { key: 'analyze_image_cost', value: values.analyzeImage });
      await api.post('/coins/config', { key: 'chat_cost', value: values.chat });
      message.success('价格配置已保存');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  const items = [
    {
      key: 'api',
      label: (
        <span>
          <KeyOutlined /> API 配置
        </span>
      ),
      children: (
        <Card>
          <Form
            form={apiForm}
            layout="vertical"
            onFinish={saveApiConfig}
          >
            <Form.Item
              name="baseUrl"
              label="API 基础地址"
              tooltip="第三方 AI 服务的 API 地址"
            >
              <Input placeholder="https://api.example.com" />
            </Form.Item>

            <Form.Item
              name="apiKey"
              label="API Key"
              tooltip="第三方 AI 服务的密钥"
            >
              <Input.Password placeholder="sk-xxxxxxxx" />
            </Form.Item>

            <Form.Item
              name="model"
              label="图像生成模型"
              tooltip="用于生成图像的模型名称"
            >
              <Input placeholder="nano-banana-2" />
            </Form.Item>

            <Form.Item
              name="chatModel"
              label="对话/分析模型"
              tooltip="用于图片分析和智能对话的模型"
            >
              <Input placeholder="gemini-2.5-pro" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                保存 API 配置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'price',
      label: (
        <span>
          <DollarOutlined /> 价格配置
        </span>
      ),
      children: (
        <Card>
          <Form
            form={priceForm}
            layout="vertical"
            onFinish={savePriceConfig}
          >
            <Form.Item
              name="generateImage"
              label="图像生成消耗 (企鹅币)"
              tooltip="每次生成图像消耗的企鹅币数量"
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="analyzeImage"
              label="图片分析消耗 (企鹅币)"
              tooltip="每次分析图片消耗的企鹅币数量"
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="chat"
              label="对话消耗 (企鹅币)"
              tooltip="每次对话消耗的企鹅币数量"
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                保存价格配置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>系统设置</h2>
        <Button icon={<ReloadOutlined />} onClick={loadSettings}>
          刷新
        </Button>
      </div>
      <Tabs items={items} />
    </div>
  );
};

export default SettingsPage;
