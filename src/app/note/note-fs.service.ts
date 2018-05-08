import { Injectable } from '@angular/core';
import * as path from 'path';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { zip } from 'rxjs/observable/zip';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import { datetime } from '../../common/datetime';
import { environment } from '../../environments/environment';
import { FsService } from '../core/fs.service';
import { NoteContent, NoteMetadata } from './models';


@Injectable()
export class NoteFsService {
    static readonly metadataFileName = 'meta.json';
    static readonly contentFileName = 'content.json';
    static readonly fileNameRegExp = /\.gd$/;

    static getFileNameFromMetadata(metadata: NoteMetadata): string {
        const createdAt = datetime.shortFormat(new Date(metadata.createdDatetime));
        const title = metadata.title.replace(' ', '-');

        return `${createdAt}-${title}.gd`;
    }

    readonly workspacePath: string;
    readonly noteStoragePath: string;

    constructor(private fsService: FsService) {
        this.workspacePath = path.resolve(environment.getPath('userData'), 'workspace/');
        this.noteStoragePath = path.resolve(this.workspacePath, 'notes/');
    }

    getMetadataFileName(noteFileName: string): string {
        return path.resolve(noteFileName, NoteFsService.metadataFileName);
    }

    getContentFileName(noteFileName: string): string {
        return path.resolve(noteFileName, NoteFsService.contentFileName);
    }

    readNoteMetadataCollection(): Observable<NoteMetadata[]> {
        return this.fsService.readDirectory(this.noteStoragePath).pipe(
            switchMap((fileNames: string[]) => {
                fileNames = fileNames
                    .filter(fileName =>
                        NoteFsService.fileNameRegExp.test(fileName))
                    .map(fileName =>
                        path.resolve(this.noteStoragePath, fileName));

                const tasks = fileNames.map(fileName =>
                    this.readNoteMetadata(fileName)
                        .pipe(filter(data => data !== null)),
                );

                return zip(...tasks);
            }),
        );
    }

    readNoteMetadata(noteFileName: string): Observable<NoteMetadata | null> {
        const metadataFileName = this.getMetadataFileName(noteFileName);

        return this.fsService.readFile(metadataFileName).pipe(
            map((buf: Buffer) => ({
                ...JSON.parse(buf.toString()),
                fileName: noteFileName,
            })),
            catchError(() => of(null)),
        );
    }

    readNoteContent(noteFileName: string): Observable<NoteContent | null> {
        const contentFileName = this.getContentFileName(noteFileName);

        return this.fsService.readFile(contentFileName).pipe(
            map((buf: Buffer) => JSON.parse(buf.toString())),
            catchError(() => of(null)),
        );
    }
}
