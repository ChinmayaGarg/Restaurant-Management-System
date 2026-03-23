import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Server, Socket } from "socket.io";

import { AuthService } from "../auth/auth.service";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

type ConnectedSocketUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  branchId: string;
  restaurantId: string;
  roles: string[];
};

type NotificationEventPayload = {
  id: string;
  branchId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  targetUserId: string | null;
  createdAt: Date;
  readAt: Date | null;
};

@WebSocketGateway({
  namespace: "/notifications",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Socket ${client.id} missing auth token`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>("JWT_SECRET"),
      });

      const user = await this.authService.validateJwtUser(payload.sub);

      if (!user || user.status !== "ACTIVE") {
        throw new Error("Invalid socket user");
      }

      const socketUser: ConnectedSocketUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        branchId: user.branchId,
        restaurantId: user.branch.restaurantId,
        roles: user.userRoles.map((ur) => ur.role.name),
      };

      client.data.user = socketUser;

      await client.join(this.branchRoom(socketUser.branchId));
      await client.join(this.userRoom(socketUser.id));

      client.emit("notifications.connected", {
        ok: true,
        branchRoom: this.branchRoom(socketUser.branchId),
        userRoom: this.userRoom(socketUser.id),
      });

      this.logger.log(
        `Socket ${client.id} connected for user ${socketUser.id} in branch ${socketUser.branchId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Socket ${client.id} failed auth: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket ${client.id} disconnected`);
  }

  @SubscribeMessage("notifications.ping")
  handlePing(client: Socket) {
    const user = client.data.user as ConnectedSocketUser | undefined;

    return {
      ok: true,
      userId: user?.id ?? null,
      branchId: user?.branchId ?? null,
      timestamp: new Date().toISOString(),
    };
  }

  emitCreated(notification: NotificationEventPayload) {
    const room = notification.targetUserId
      ? this.userRoom(notification.targetUserId)
      : this.branchRoom(notification.branchId);

    this.server.to(room).emit("notification.created", notification);
  }

  emitRead(
    notification: Pick<
      NotificationEventPayload,
      "id" | "branchId" | "targetUserId" | "readAt"
    >,
  ) {
    const room = notification.targetUserId
      ? this.userRoom(notification.targetUserId)
      : this.branchRoom(notification.branchId);

    this.server.to(room).emit("notification.read", {
      id: notification.id,
      isRead: true,
      readAt: notification.readAt,
    });
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.trim()) {
      return authToken.startsWith("Bearer ") ? authToken.slice(7) : authToken;
    }

    const headerAuth = client.handshake.headers.authorization;
    if (typeof headerAuth === "string" && headerAuth.trim()) {
      return headerAuth.startsWith("Bearer ")
        ? headerAuth.slice(7)
        : headerAuth;
    }

    return null;
  }

  private branchRoom(branchId: string) {
    return `branch:${branchId}`;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
