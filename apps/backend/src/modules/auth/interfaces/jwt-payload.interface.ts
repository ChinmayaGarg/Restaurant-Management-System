export interface JwtPayload {
  sub: string;
  email: string;
  branchId: string;
  restaurantId: string;
  roles: string[];
}
