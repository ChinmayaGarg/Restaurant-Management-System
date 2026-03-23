"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRolePermissions = seedRolePermissions;
var client_1 = require("@prisma/client");
var role_defaults_1 = require("../../../../packages/permissions/role-defaults");
var prisma = new client_1.PrismaClient();
function seedRolePermissions(restaurantId) {
    return __awaiter(this, void 0, void 0, function () {
        var roles, permissions, permissionMap, roleMap, _i, _a, _b, roleName, permissionKeys, roleId, _c, permissionKeys_1, permissionKey, permissionId;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, prisma.role.findMany({
                        where: { restaurantId: restaurantId },
                    })];
                case 1:
                    roles = _d.sent();
                    return [4 /*yield*/, prisma.permission.findMany()];
                case 2:
                    permissions = _d.sent();
                    permissionMap = new Map(permissions.map(function (p) { return [p.key, p.id]; }));
                    roleMap = new Map(roles.map(function (r) { return [r.name, r.id]; }));
                    _i = 0, _a = Object.entries(role_defaults_1.ROLE_DEFAULTS);
                    _d.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    _b = _a[_i], roleName = _b[0], permissionKeys = _b[1];
                    roleId = roleMap.get(roleName);
                    if (!roleId)
                        return [3 /*break*/, 7];
                    _c = 0, permissionKeys_1 = permissionKeys;
                    _d.label = 4;
                case 4:
                    if (!(_c < permissionKeys_1.length)) return [3 /*break*/, 7];
                    permissionKey = permissionKeys_1[_c];
                    permissionId = permissionMap.get(permissionKey);
                    if (!permissionId)
                        return [3 /*break*/, 6];
                    return [4 /*yield*/, prisma.rolePermission.upsert({
                            where: {
                                roleId_permissionId: {
                                    roleId: roleId,
                                    permissionId: permissionId,
                                },
                            },
                            update: {},
                            create: {
                                roleId: roleId,
                                permissionId: permissionId,
                            },
                        })];
                case 5:
                    _d.sent();
                    _d.label = 6;
                case 6:
                    _c++;
                    return [3 /*break*/, 4];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8:
                    console.log("Seeded role-permission mappings");
                    return [2 /*return*/];
            }
        });
    });
}
