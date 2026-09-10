import React from 'react';
import { Modal } from '../common/Modal';
import { NicheManagementPanel } from './NicheManagementPanel';

interface NicheManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNichesChanged?: () => void;
}

export const NicheManagerModal: React.FC<NicheManagerModalProps> = ({
  isOpen,
  onClose,
  onNichesChanged,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerenciador de Nichos da Vitrine"
      subtitle="Edite imagens, títulos, textos, adicione novos nichos ou remova nichos existentes"
      maxWidth="6xl"
    >
      <div className="max-h-[82vh] overflow-y-auto pr-1">
        <NicheManagementPanel
          onNichesChanged={onNichesChanged}
          onClose={onClose}
        />
      </div>
    </Modal>
  );
};
