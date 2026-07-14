import { Heart, UsersThree } from '@phosphor-icons/react';

export const REL_ICON = {
  Parent: <UsersThree />,
  Child: <UsersThree />,
  Spouse: <Heart />,
  Sibling: <UsersThree />,
  Grandparent: <UsersThree />,
  Grandchild: <UsersThree />,
  'Uncle/Aunt': <UsersThree />,
  'Niece/Nephew': <UsersThree />,
};

export const REL_TYPE_KEY = {
  Parent: 'parent',
  Child: 'child',
  Spouse: 'spouse',
  Sibling: 'sibling',
  Grandparent: 'grandparent',
  Grandchild: 'grandchild',
  'Uncle/Aunt': 'uncleAunt',
  'Niece/Nephew': 'nieceNephew',
};

export const getRelIcon = (type) => REL_ICON[type] || <UsersThree />;
export const getRelTypeKey = (type) => REL_TYPE_KEY[type] || type.toLowerCase();
