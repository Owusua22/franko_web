import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSalesOrderById, fetchOrderDeliveryAddress } from '../../../Redux/Slice/orderSlice';
import {
  Modal,
  Spin,
  Typography,
  Image,
  Divider,
  Card,
  Button,
  Space,
  Badge,
  Tag,
  Empty,
  Tooltip,
  message
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  DownloadOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  DollarOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  CloseOutlined,
  PrinterOutlined
} from '@ant-design/icons';

import { CMS_BASE_URL } from "../../../config/media";

const { Title, Text, Paragraph } = Typography;

const AgentOrderModal = ({ orderId, orderCode, isModalVisible, onClose }) => {
  const dispatch = useDispatch();
  const { salesOrder, loading, error, deliveryAddress } = useSelector((state) => state.orders);
  const [imagePreview, setImagePreview] = useState({ visible: false, url: null });
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (orderId && isModalVisible) {
      dispatch(fetchSalesOrderById(orderId));
      dispatch(fetchOrderDeliveryAddress(orderId));
    }
  }, [dispatch, orderId, isModalVisible]);

  const formatPrice = (amount) => parseFloat(amount || 0).toFixed(2);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const generateInvoiceHTML = () => {
    if (!salesOrder || salesOrder.length === 0) return null;

    const order = salesOrder[0];
    const address = deliveryAddress?.[0] || {};
    const totalAmount = salesOrder.reduce((total, item) => total + (item.price * item.quantity), 0);
    const currentDate = new Date();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${order?.orderCode || orderCode}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            margin: 0;
            padding: 20px;
            color: #2d3748;
            line-height: 1.6;
            background-color: #ffffff;
          }

          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
          }

          .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }

          .company-name {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }

          .company-info {
            font-size: 14px;
            opacity: 0.9;
            font-weight: 300;
          }

          .invoice-title {
            font-size: 36px;
            font-weight: bold;
            margin: 30px 0;
            text-align: center;
            color: #4CAF50;
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          .content {
            padding: 30px;
          }

          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 30px;
          }

          .invoice-info, .customer-info {
            flex: 1;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
          }

          .section-title {
            color: #4CAF50;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .info-row {
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
          }

          .info-label {
            font-weight: 600;
            color: #495057;
            min-width: 120px;
          }

          .info-value {
            color: #212529;
            font-weight: 500;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }

          thead {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          }

          th {
            color: white;
            font-weight: bold;
            padding: 15px 12px;
            text-align: left;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          td {
            padding: 15px 12px;
            border-bottom: 1px solid #e9ecef;
            font-size: 14px;
          }

          tbody tr:nth-child(even) {
            background-color: #f8f9fa;
          }

          tbody tr:hover {
            background-color: #e3f2fd;
            transition: background-color 0.2s ease;
          }

          .text-right { text-align: right; }
          .text-center { text-align: center; }

          .total-section {
            margin-top: 30px;
            text-align: right;
          }

          .subtotal-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
            font-size: 14px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 20px;
            color: #4CAF50;
            padding: 15px 0;
            border-top: 2px solid #4CAF50;
            margin-top: 10px;
          }

          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
          }

          .thank-you {
            font-size: 16px;
            color: #4CAF50;
            font-weight: 600;
            margin-bottom: 10px;
          }

          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(76, 175, 80, 0.05);
            font-weight: bold;
            z-index: -1;
            pointer-events: none;
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
              background: white;
            }

            .invoice-container {
              box-shadow: none;
              border-radius: 0;
            }

            .header {
              background: #4CAF50 !important;
              -webkit-print-color-adjust: exact;
            }

            thead {
              background: #4CAF50 !important;
              -webkit-print-color-adjust: exact;
            }

            th {
              color: white !important;
              -webkit-print-color-adjust: exact;
            }
          }

          @media (max-width: 768px) {
            .info-section {
              flex-direction: column;
              gap: 15px;
            }

            .invoice-info, .customer-info {
              margin-bottom: 0;
            }

            table {
              font-size: 12px;
            }

            th, td {
              padding: 10px 8px;
            }

            .company-name {
              font-size: 24px;
            }

            .invoice-title {
              font-size: 28px;
            }
          }
        </style>
      </head>
      <body>
        <div class="watermark">FRANKO TRADING</div>
        <div class="invoice-container">
          <div class="header">
            <div class="company-name">Franko Trading Ltd.</div>
            <div class="company-info">
              123 Adabraka Street, Accra, Ghana<br>
              Phone: +233 123 456 789 | Email: online@frankotrading.com<br>
              Website: www.frankotrading.com
            </div>
          </div>

          <div class="content">
            <div class="invoice-title">INVOICE</div>

            <div class="info-section">
              <div class="invoice-info">
                <div class="section-title">Invoice Details</div>
                <div class="info-row">
                  <span class="info-label">Order Code:</span>
                  <span class="info-value">${order?.orderCode || orderCode}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Order Date:</span>
                  <span class="info-value">${formatDate(order?.orderDate)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Invoice Date:</span>
                  <span class="info-value">${formatDate(currentDate)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value" style="color: #28a745; font-weight: 600;">Confirmed</span>
                </div>
              </div>

              <div class="customer-info">
                <div class="section-title">Bill To</div>
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${address?.recipientName || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Contact:</span>
                  <span class="info-value">${address?.recipientContactNumber || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Address:</span>
                  <span class="info-value">${address?.address || 'N/A'}</span>
                </div>
                ${address?.orderNote ? `
                  <div class="info-row">
                    <span class="info-label">Note:</span>
                    <span class="info-value" style="font-style: italic;">${address.orderNote}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 60px;">SN</th>
                  <th>Product Description</th>
                  <th style="width: 80px;" class="text-center">Qty</th>
                  <th style="width: 120px;" class="text-right">Unit Price</th>
                  <th style="width: 120px;" class="text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${salesOrder.map((item, index) => `
                  <tr>
                    <td class="text-center" style="font-weight: 600;">${index + 1}</td>
                    <td>
                      <div style="font-weight: 600; color: #212529;">${item.productName || 'Product Name Not Available'}</div>
                      <div style="font-size: 12px; color: #6c757d; margin-top: 2px;">Item Code: PRD${String(index + 1).padStart(3, '0')}</div>
                    </td>
                    <td class="text-center" style="font-weight: 600;">${item.quantity || 0}</td>
                    <td class="text-right">₵${formatPrice(item.price)}</td>
                    <td class="text-right" style="font-weight: 600;">₵${formatPrice(item.price * item.quantity)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total-section">
              <div class="subtotal-row">
                <span>Subtotal:</span>
                <span>₵${formatPrice(totalAmount)}</span>
              </div>
              <div class="subtotal-row">
                <span>Tax (0%):</span>
                <span>₵0.00</span>
              </div>
              <div class="subtotal-row">
                <span>Shipping:</span>
                <span>₵0.00</span>
              </div>
              <div class="total-row">
                <span>TOTAL AMOUNT:</span>
                <span>₵${formatPrice(totalAmount)}</span>
              </div>
            </div>

            <div class="footer">
              <div class="thank-you">Thank you for your business!</div>
              <p>This is a computer-generated invoice and does not require a signature.</p>
              <p>For any queries, please contact us at online@frankotrading.com or +233 123 456 789</p>
              <p style="margin-top: 10px; font-size: 11px;">Generated on ${currentDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const downloadInvoice = async () => {
    try {
      setIsDownloading(true);

      if (!salesOrder || salesOrder.length === 0) {
        message.error('No order data available for invoice generation');
        return;
      }

      const invoiceHTML = generateInvoiceHTML();
      if (!invoiceHTML) {
        message.error('Failed to generate invoice content');
        return;
      }

      // Create and open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        message.error('Please allow pop-ups to download the invoice');
        return;
      }

      printWindow.document.write(invoiceHTML);
      printWindow.document.close();

      // Wait for content to load before printing
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();

          // Optional: Close the window after printing (uncomment if needed)
          // printWindow.onafterprint = function() {
          //   printWindow.close();
          // };
        }, 500);
      };

      message.success('Invoice opened in new window. Please use your browser\'s print function to save as PDF.');

    } catch (error) {
      console.error('Error generating invoice:', error);
      message.error('Failed to generate invoice. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Alternative method for direct PDF download using browser's built-in functionality
  const downloadInvoiceAsPDF = async () => {
    try {
      setIsDownloading(true);

      if (!salesOrder || salesOrder.length === 0) {
        message.error('No order data available for invoice generation');
        return;
      }

      const invoiceHTML = generateInvoiceHTML();
      if (!invoiceHTML) {
        message.error('Failed to generate invoice content');
        return;
      }

      // Create a temporary iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(invoiceHTML);
      iframeDoc.close();

      // Wait for content to load
      iframe.onload = function() {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();

          // Clean up
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };




    } catch (error) {
      console.error('Error generating invoice:', error);
      message.error('Failed to generate invoice. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const backendBaseURL = CMS_BASE_URL;
  const totalAmount = salesOrder.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = salesOrder.reduce((acc, item) => acc + item.quantity, 0);

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };

  const renderProductImage = (item) => {
    const imagePath = item?.imagePath;
    const imageUrl = imagePath
      ? `${backendBaseURL}/Media/Products_Images/${imagePath.split('\\').pop()}`
      : null;

    return (
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          border: '1.5px solid #f9fafb'
        }}>
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={item?.productName || 'Product'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={handleImageError}
              />
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
                }}
              >
                <ShoppingCartOutlined style={{ color: '#9ca3af', fontSize: '20px' }} />
              </div>
            </>
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
            }}>
              <ShoppingCartOutlined style={{ color: '#9ca3af', fontSize: '20px' }} />
            </div>
          )}
        </div>

        <Badge
          count={item?.quantity || 0}
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#10b981',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
            fontSize: '10px',
            height: '18px',
            minWidth: '18px',
            lineHeight: '18px'
          }}
        />
      </div>
    );
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
            }}>
              <ShoppingOutlined style={{ color: 'white', fontSize: '16px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '1px' }}>
                Order Details
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>#{orderCode}</div>
            </div>
            <Tag color="success" style={{ margin: 0, fontSize: '10px', padding: '1px 6px', borderRadius: '4px' }}>
              Active
            </Tag>
          </div>
        }
        open={isModalVisible}
        onCancel={onClose}
        width="100%"
        centered
        className="order-modal-responsive"
        style={{ maxWidth: '850px', margin: '0 auto' }}
        styles={{
          body: { padding: '12px' },
          header: {
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '10px',
            paddingTop: '10px',
            background: '#fafafa'
          }
        }}
        footer={
          salesOrder.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '4px 0'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', fontWeight: 500 }}>Total Items</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6' }}>{totalItems}</div>
                </div>
                <Divider type="vertical" style={{ height: '36px', margin: '0 6px', borderColor: '#d1d5db' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', fontWeight: 500 }}>Total Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                    ₵{formatPrice(totalAmount)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={downloadInvoice}
                  loading={isDownloading}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
                    height: '40px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px'
                  }}
                >
                  Download Invoice
                </Button>

                <Tooltip title="Alternative print method">
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={downloadInvoiceAsPDF}
                    loading={isDownloading}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      border: 'none',
                      color: 'white',
                      boxShadow: '0 3px 10px rgba(59, 130, 246, 0.3)',
                      height: '40px',
                      borderRadius: '6px',
                      minWidth: '40px'
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          ) : null
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <Space direction="vertical" align="center" size="middle">
              <Spin size="large" />
              <Text type="secondary" style={{ fontSize: '13px' }}></Text>
            </Space>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: '#fee2e2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <ShoppingOutlined style={{ color: '#ef4444', fontSize: '24px' }} />
            </div>
            <Title level={5} type="danger" style={{ fontSize: '15px', marginBottom: '6px' }}>Unable to load order</Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {error?.message || error || 'An unexpected error occurred'}
            </Text>
          </div>
        ) : salesOrder.length === 0 ? (
          <div style={{ padding: '36px 20px' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>
                    No order details found
                  </Text>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Please check the order code and try again
                  </Text>
                </div>
              }
            />
          </div>
        ) : (
          <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '2px' }} className="custom-scrollbar">
            {/* Order Summary Cards - Compact Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <Card
                className="summary-card"
                style={{
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  border: '1px solid #93c5fd',
                  borderRadius: '8px'
                }}
                bodyStyle={{ padding: '10px 8px' }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px'
                }}>
                  <CalendarOutlined style={{ color: 'white', fontSize: '14px' }} />
                </div>
                <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px', fontWeight: 500 }}>Order Date</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e40af' }}>
                  {formatDate(salesOrder[0]?.orderDate)}
                </div>
              </Card>

              <Card
                className="summary-card"
                style={{
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  border: '1px solid #6ee7b7',
                  borderRadius: '8px'
                }}
                bodyStyle={{ padding: '10px 8px' }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#10b981',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px'
                }}>
                  <ShoppingCartOutlined style={{ color: 'white', fontSize: '14px' }} />
                </div>
                <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px', fontWeight: 500 }}>Total Items</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#065f46' }}>{totalItems}</div>
              </Card>

              <Card
                className="summary-card"
                style={{
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
                  border: '1px solid #fb923c',
                  borderRadius: '8px'
                }}
                bodyStyle={{ padding: '10px 8px' }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#f97316',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px'
                }}>
                  <DollarOutlined style={{ color: 'white', fontSize: '14px' }} />
                </div>
                <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px', fontWeight: 500 }}>Amount</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#9a3412' }}>
                  ₵{formatPrice(totalAmount)}
                </div>
              </Card>
            </div>

            {/* Delivery Address Card - Compact */}
            <Card
              style={{
                marginBottom: '12px',
                background: 'white',
                borderLeft: '3px solid #6366f1',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}
              bodyStyle={{ padding: '10px' }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    background: '#6366f1',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <EnvironmentOutlined style={{ color: 'white', fontSize: '13px' }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                    Delivery Info
                  </span>
                </div>
              }
              headStyle={{ padding: '8px 10px', minHeight: 'auto', borderBottom: '1px solid #f3f4f6' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  background: '#f9fafb',
                  borderRadius: '6px'
                }}>
                  <UserOutlined style={{ color: '#6366f1', fontSize: '13px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '1px', fontWeight: 500 }}>
                      Recipient
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                      {deliveryAddress?.[0]?.recipientName || 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  background: '#f9fafb',
                  borderRadius: '6px'
                }}>
                  <PhoneOutlined style={{ color: '#10b981', fontSize: '13px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '1px', fontWeight: 500 }}>
                      Contact
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                      {deliveryAddress?.[0]?.recipientContactNumber || 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '8px 10px',
                  background: '#f9fafb',
                  borderRadius: '6px'
                }}>
                  <HomeOutlined style={{ color: '#3b82f6', fontSize: '13px', marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px', fontWeight: 500 }}>
                      Address
                    </div>
                    <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.4' }}>
                      {deliveryAddress?.[0]?.address || 'N/A'}
                    </div>
                  </div>
                </div>

                {deliveryAddress?.[0]?.orderNote && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    background: '#fef3c7',
                    borderRadius: '6px'
                  }}>
                    <FileTextOutlined style={{ color: '#f59e0b', fontSize: '13px', marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '9px', color: '#92400e', marginBottom: '2px', fontWeight: 500 }}>
                        Note
                      </div>
                      <div style={{ fontSize: '11px', color: '#78350f', fontStyle: 'italic', lineHeight: '1.4' }}>
                        {deliveryAddress[0].orderNote}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Products Section - Compact */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      background: '#10b981',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ShoppingCartOutlined style={{ color: 'white', fontSize: '13px' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      Order Items
                    </span>
                  </div>
                  <Badge
                    count={salesOrder.length}
                    style={{
                      backgroundColor: '#10b981',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                      fontSize: '10px'
                    }}
                  />
                </div>
              }
              style={{
                background: 'white',
                borderLeft: '3px solid #10b981',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}
              bodyStyle={{ padding: '10px' }}
              headStyle={{ padding: '8px 10px', minHeight: 'auto', borderBottom: '1px solid #f3f4f6' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {salesOrder.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      padding: '10px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      border: '1px solid #f3f4f6'
                    }}
                  >
                    {renderProductImage(item)}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#111827',
                          marginBottom: '1px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item?.productName || 'Product Name Not Available'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 500 }}>Item #{index + 1}</div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px'
                      }}>
                        <div style={{
                          textAlign: 'center',
                          padding: '6px 4px',
                          background: '#dbeafe',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontSize: '8px', color: '#6b7280', marginBottom: '1px', fontWeight: 500 }}>
                            Qty
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
                            {item?.quantity || 0}
                          </div>
                        </div>
                        <div style={{
                          textAlign: 'center',
                          padding: '6px 4px',
                          background: '#d1fae5',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontSize: '8px', color: '#6b7280', marginBottom: '1px', fontWeight: 500 }}>
                            Price
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#065f46' }}>
                            ₵{formatPrice(item?.price || 0)}
                          </div>
                        </div>
                        <div style={{
                          textAlign: 'center',
                          padding: '6px 4px',
                          background: '#fed7aa',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontSize: '8px', color: '#6b7280', marginBottom: '1px', fontWeight: 500 }}>
                            Total
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9a3412' }}>
                            ₵{formatPrice((item?.price || 0) * (item?.quantity || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        open={imagePreview.visible}
        onCancel={() => setImagePreview({ visible: false, url: null })}
        footer={null}
        width="90%"
        style={{ maxWidth: '600px' }}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Image
            src={imagePreview.url}
            alt="Product Preview"
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
            preview={false}
          />
        </div>
      </Modal>

      <style jsx global>{`
        .order-modal-responsive .ant-modal-header {
          background: #fafafa;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        @media (max-width: 768px) {
          .order-modal-responsive .ant-modal {
            padding: 0 6px;
            max-width: 95vw !important;
          }

          .order-modal-responsive .ant-modal-body {
            padding: 10px;
          }

          .order-modal-responsive .ant-modal-footer {
            padding: 10px;
          }

          .order-modal-responsive .ant-modal-header {
            padding: 10px 12px;
          }
        }

        @media (max-width: 480px) {
          .summary-card .ant-card-body {
            padding: 8px 6px !important;
          }
        }
      `}</style>
    </>
  );
};

export default AgentOrderModal;