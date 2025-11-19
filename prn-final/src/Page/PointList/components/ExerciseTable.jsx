import React from "react";
import { Table, Typography, Space, Tag, Button, Popconfirm } from "antd";
import { FileTextOutlined, DeleteOutlined, ArrowRightOutlined } from "@ant-design/icons";

const ExerciseTable = ({ exercises, onSelect, onDelete, deletingId }) => {
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (id) => <Tag color="geekblue">{id}</Tag>,
    },
    {
      title: "Mã bài thi",
      dataIndex: "examCode",
      key: "examCode",
      width: 150,
      render: (examCode, record) => (
        <Space>
          <FileTextOutlined style={{ color: "#1677ff" }} />
          <Typography.Text strong>
            {examCode || `Bài ${record.id}`}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Tên bài thi",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (title) => (
        <Typography.Text>{title || "-"}</Typography.Text>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (description) => (
        <Typography.Text type="secondary">
          {description || "-"}
        </Typography.Text>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={() => onSelect(record.id)}
          >
            Xem
          </Button>
          <Popconfirm
            title="Xóa bài thi này?"
            description="Hành động này không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={(event) => {
              event?.stopPropagation();
              onDelete(record.id);
            }}
            onCancel={(event) => event?.stopPropagation()}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === record.id}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={exercises}
      rowKey="id"
      pagination={false}
      onRow={(record) => ({
        onClick: () => onSelect(record.id),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default ExerciseTable;

