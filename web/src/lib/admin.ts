export type AdminUser = {
  email: string;
  username?: string;
  system_role: string;
  status: string;
};

export type AdminTenant = {
  id: string;
  name: string;
  status: string;
};
