import { Body, Controller, Get, Post, HttpCode, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from './dto/login.dto';
import { Public, CurrentUser } from './decorators';

@Controller('auth')
export class AuthController {
    constructor(private auth: AuthService) {}

    @Public()
    @Post('login')
    @HttpCode(200)
    login(@Body() dto: LoginDto, @Req() req: any) {
        return this.auth.login(dto.email, dto.password, req.ip);
    }

    @Get('me')
    me(@CurrentUser() user: any) {
        return user;
    }
}