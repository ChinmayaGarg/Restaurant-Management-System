export class AuthResponseDto {
  accessToken!: string;
  tokenType!: "Bearer";
  user!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    branchId: string;
    roles: string[];
  };
}
