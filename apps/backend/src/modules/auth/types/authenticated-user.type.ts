export interface JwtPayload {
  sub: string; // user id
  email: string;
  branchId: string;
  restaurantId: string;
  roles: string[];
}
