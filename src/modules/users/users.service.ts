import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { CreateUserDto } from "./dto/create-user.dto";
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from "./dto/update-user.dto";




@Injectable()
export class UsersService{
    constructor(
        @InjectRepository(User)
        private readonly usersRepository:Repository<User>,
    ){
    }

    async create(createUserDto:CreateUserDto): Promise<User> {
        const existingUser = await this.usersRepository.findOne({
            where: { email: createUserDto.email} as any,
        });

        if(existingUser){
            throw new ConflictException('email already exists');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password,10);

        const user = this.usersRepository.create({
            ... createUserDto,
            password: hashedPassword,
        });

        return this.usersRepository.save(user);
    }
    async findAll(): Promise<User[]>{
        return this.usersRepository.find();
    }

    async findOne(id: string) : Promise<User> {
        const user = await this.usersRepository.findOne({
            where: {id}
        });
    

        if(!user){
            throw new NotFoundException('user with id ${id} not found');

        }
        return user;
    }

        async findByEmail( email:string): Promise<User | null> {
            return this.usersRepository.findOne({where: {email } as any});

        }
        async update(id:string,updateUserDto:UpdateUserDto): Promise<User>{
            const user =await this.findOne(id);

            if(updateUserDto.password){
                updateUserDto.password = await bcrypt.hash(updateUserDto.password,10);
            }
            Object.assign(user,updateUserDto);
            return this.usersRepository.save(user);
        }

        async updateRefreshToken(
            id: string,
            refreshToken: string | null,
        ): Promise<void>{
            const hashedToken = refreshToken
              ? await bcrypt.hash(refreshToken,10)
              : null;

              await this.usersRepository.update(id,{refreshToken:hashedToken});
        }

        async remove(id:string): Promise<void> {
            const user= await this.findOne(id);
            await this.usersRepository.remove(user);
        }
    
}