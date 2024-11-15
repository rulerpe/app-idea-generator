import { Injectable } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirestoreService {
  private firestore: Firestore;

  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('firestore.projectId');
    const credentials = this.configService.get('firestore.credentials');

    this.firestore = new Firestore({
      projectId,
      credentials: credentials || undefined,
    });
  }

  collection(name: string) {
    return this.firestore.collection(name);
  }
}