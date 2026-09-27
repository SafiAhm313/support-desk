import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/user.entity';
import { LoginAttempt } from './login-attempt.entity';

// Documented in docs/RUNBOOK.md: 5 failed logins in 15 minutes returns 429.
const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(LoginAttempt)
    private readonly loginAttemptsRepository: Repository<LoginAttempt>,
  ) {}

  async register(dto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });
    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const recentFailures = await this.loginAttemptsRepository.count({
      where: {
        email: dto.email,
        createdAt: MoreThan(windowStart),
      },
    });

    if (recentFailures >= MAX_FAILED_ATTEMPTS) {
      throw new HttpException(
        'Too many failed login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersService.findByEmail(dto.email);
    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      await this.loginAttemptsRepository.save(
        this.loginAttemptsRepository.create({ email: dto.email }),
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
