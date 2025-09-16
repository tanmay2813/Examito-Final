
import React from 'react';
import { Icon } from './Icon';

export const FlashcardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
    <path d="M12 5v14"></path>
    <path d="M12 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5"></path>
    <path d="M12 5h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"></path>
  </Icon>
);
