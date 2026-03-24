export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    branchId: string;
    roles: string[];
  };
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  branchId: string;
  restaurantId: string;
  roles: string[];
};
