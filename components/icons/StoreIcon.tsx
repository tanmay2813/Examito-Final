
import React from 'react';
import { Icon } from './Icon';

export const StoreIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <path d="M3 9.5a.5.5 0 0 1 .5-.5h17a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-17a.5.5 0 0 1-.5-.5v-12z"></path>
    <path d="M6 9V5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v4"></path>
  </Icon>
);
