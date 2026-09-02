import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  findAll(): Promise<Tag[]> {
    return this.tagsRepository.find();
  }

  async create(dto: CreateTagDto): Promise<Tag> {
    const existing = await this.tagsRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Tag name already exists');
    }
    const tag = this.tagsRepository.create({ name: dto.name });
    return this.tagsRepository.save(tag);
  }
}