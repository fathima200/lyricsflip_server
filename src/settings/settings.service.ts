import { PartialType } from '@nestjs/mapped-types';
import { CreateSettingsDto } from './create-settings.dto';

export class UpdateSettingsDto extends PartialType(CreateSettingsDto) {}

// src/settings/settings.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';
import { CreateSettingsDto } from './dto/create-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  async findByUserId(userId: string): Promise<Settings> {
    return this.settingsRepository.findOne({ where: { userId } });
  }

  async create(userId: string, createSettingsDto: CreateSettingsDto): Promise<Settings> {
    const settings = this.settingsRepository.create({
      userId,
      ...createSettingsDto,
    });
    return this.settingsRepository.save(settings);
  }

  async update(userId: string, updateSettingsDto: UpdateSettingsDto): Promise<Settings> {
    const settings = await this.findByUserId(userId);
    
    // Update settings if they exist
    if (settings) {
      const updatedSettings = { 
        ...settings,
        ...updateSettingsDto,
        updatedAt: new Date()
      };
      return this.settingsRepository.save(updatedSettings);
    }
    
    // Create new settings if they don't exist
    return this.create(userId, updateSettingsDto);
  }

  async delete(userId: string): Promise<void> {
    await this.settingsRepository.delete({ userId });
  }
}

// src/settings/settings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { Settings } from './entities/settings.entity';
import { CreateSettingsDto } from './dto/create-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async getSettingsByUserId(userId: string): Promise<Settings> {
    const settings = await this.settingsRepository.findByUserId(userId);
    if (!settings) {
      throw new NotFoundException(`Settings for user with ID "${userId}" not found`);
    }
    return settings;
  }

  async createSettings(userId: string, createSettingsDto: CreateSettingsDto): Promise<Settings> {
    return this.settingsRepository.create(userId, createSettingsDto);
  }

  async updateSettings(userId: string, updateSettingsDto: UpdateSettingsDto): Promise<Settings> {
    return this.settingsRepository.update(userId, updateSettingsDto);
  }

  async getOrCreateSettings(userId: string): Promise<Settings> {
    let settings = await this.settingsRepository.findByUserId(userId);
    
    if (!settings) {
      // Create default settings if none exist
      settings = await this.createSettings(userId, {});
    }
    
    return settings;
  }

  async deleteSettings(userId: string): Promise<void> {
    return this.settingsRepository.delete(userId);
  }
  
  // Helper method to filter categories based on user preferences
  async filterCategoriesByUserPreferences(userId: string, allCategories: string[]): Promise<string[]> {
    const settings = await this.getOrCreateSettings(userId);
    
    // If no preferred categories are set or the array is empty, return all categories
    if (!settings.preferredCategories || settings.preferredCategories.length === 0) {
      return allCategories;
    }
    
    // Filter categories based on user preferences
    return allCategories.filter(category => 
      settings.preferredCategories.includes(category)
    );
  }
}