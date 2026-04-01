import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(name: string, password: string): Promise<any> {
    const user = await this.usersService.findByName(name);
    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuario inactivo. Contacte al administrador.');
    }

    return user;
  }

  async login(name: string, password: string) {
    const user = await this.validateUser(name, password);

    // user.role es ahora el objeto poblado { _id, name }
    const roleName: string = user.role?.name ?? 'Sin Rol';

    const payload = {
      sub: user._id,
      name: user.name,
      role: roleName,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        name: user.name,
        role: roleName,
      },
    };
  }
}
