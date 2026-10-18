import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]): string => clsx(inputs);

export const formatToman = (amount: number): string =>
  `${new Intl.NumberFormat('fa-IR').format(amount)} تومان`;
