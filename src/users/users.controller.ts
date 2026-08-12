import { Body, Controller, Get, Post } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from './dto/create-user.dto';
import { Roles, CurrentUser } from "../auth/decorators";

@Controller('users')
export class UsersController {
    constructor(private users: UsersService) {}

    @Roles('SUPERADMIN', 'ADMIN')
    @Post()
    create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
        return this.users.create(user, dto);
    }

    @Roles('SUPERADMIN', 'ADMIN')
    @Get()
    findAll() {
        return this.users.findAll();
    }
}