import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role?: UserRole;
  }): Promise<User> {
    const user = this.usersRepository.create({
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      role: data.role ?? UserRole.CUSTOMER,
    });
    return this.usersRepository.save(user);
  }
}