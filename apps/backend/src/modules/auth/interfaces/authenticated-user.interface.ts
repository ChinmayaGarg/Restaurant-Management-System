export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  branchId: string;
  restaurantId: string;
  roles: string[];
}
