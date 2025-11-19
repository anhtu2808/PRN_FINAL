import { Modal, List, Tag } from "antd";

const ExportHistoryModal = ({ open, onClose, history, formatDate }) => {
  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Lịch sử Export">
      <List
        dataSource={history}
        renderItem={(item) => (
          <List.Item
            actions={[
              <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                Tải xuống
              </a>
            ]}
          >
            <List.Item.Meta
              title={`File: ${item.fileName}`}
              description={`Ngày: ${formatDate(item.createdAt)}`}
            />
            <Tag color="blue">{item.status}</Tag>
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default ExportHistoryModal;
