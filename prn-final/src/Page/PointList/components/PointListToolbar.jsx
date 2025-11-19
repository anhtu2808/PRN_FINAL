import React from "react";
import { Card, Space, Typography, Segmented, Button, Statistic } from "antd";
import { AppstoreOutlined, OrderedListOutlined, PlusCircleOutlined, TableOutlined, LogoutOutlined } from "@ant-design/icons";

const PointListToolbar = ({ totalItems, viewMode, onViewChange, onCreateTurn, onLogout }) => {
  return (
    <Card bodyStyle={{ padding: 24 }}>
      <Space
        direction="vertical"
        size="small"
        style={{ width: "100%" }}
      >
        <Space
          align="start"
          style={{
            width: "100%",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <Space direction="vertical" size={4}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Danh sách bài chấm điểm
            </Typography.Title>
            <Statistic
              title="Tổng số bài"
              value={totalItems}
              valueStyle={{ fontSize: 18 }}
            />
          </Space>
          <Space wrap>
            <Segmented
              value={viewMode}
              onChange={onViewChange}
              options={[
                { label: "Bảng", value: "table", icon: <TableOutlined /> },
              ]}
            />
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              onClick={onCreateTurn}
            >
              Tạo lượt chấm mới
            </Button>
            <Button
              danger
              icon={<LogoutOutlined />}
              onClick={onLogout}
            >
              Đăng xuất
            </Button>
          </Space>
        </Space>
      </Space>
    </Card>
  );
};

export default PointListToolbar;

