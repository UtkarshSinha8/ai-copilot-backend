import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Reusable guard — protects routes that require a valid access token
// Use with @UseGuards(JwtAuthGuard) on any controller or route
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}