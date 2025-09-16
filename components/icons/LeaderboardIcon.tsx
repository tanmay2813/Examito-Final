

import React from 'react';
import { Icon } from './Icon';

export const LeaderboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <path d="M16 8.5l-4-4-4 4"></path>
    <path d="M12 4.5v15"></path>
    <path d="M20.5 10.5h-4"></path>
    <path d="M3.5 10.5h4"></path>
    <path d="M15 14.5h-6"></path>
  </Icon>
);