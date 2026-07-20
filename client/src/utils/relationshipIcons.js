import {
  User,
  Person,
  Heart,
  Users,
  UsersThree,
  UserCircle,
  Baby,
} from '@phosphor-icons/react';

export const REL_ICON = {
  Parent: <User />,
  Child: <Person />,
  Spouse: <Heart />,
  Sibling: <Users />,
  Grandparent: <UserCircle />,
  Grandchild: <Baby />,
  'Uncle/Aunt': <UsersThree />,
  'Niece/Nephew': <Users />,
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
