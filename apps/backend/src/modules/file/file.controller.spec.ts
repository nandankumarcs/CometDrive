import { Test, TestingModule } from '@nestjs/testing';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { SuccessResponse } from '../../commons/dtos/success-response.dto';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const mockFileService = {
  upload: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  downloadZip: jest.fn(),
  getDownloadStream: jest.fn(),
  trash: jest.fn(),
  restore: jest.fn(),
  deletePermanently: jest.fn(),
  emptyTrash: jest.fn(),
  toggleStar: jest.fn(),
  getSignedUrl: jest.fn(),
  getPlaybackProgress: jest.fn(),
  upsertPlaybackProgress: jest.fn(),
  getContinueWatching: jest.fn(),
  dismissPlaybackProgress: jest.fn(),
};

const mockResponse = {
  set: jest.fn(),
} as any as Response;

describe('FileController', () => {
  let controller: FileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        {
          provide: FileService,
          useValue: mockFileService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<FileController>(FileController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('upload', () => {
    it('should upload a file', async () => {
      const file = { originalname: 'test.txt' } as any;
      const req = { user: { id: 1 } };
      const dto = { folderUuid: 'uuid' };
      const uploadedFile = { id: 1, name: 'test.txt' };

      mockFileService.upload.mockResolvedValue(uploadedFile);

      const result = await controller.upload(file, dto, req);

      expect(mockFileService.upload).toHaveBeenCalledWith(file, req.user, dto);
      expect(result).toEqual(new SuccessResponse('File uploaded successfully', uploadedFile));
    });
  });

  describe('findAll', () => {
    it('should return files', async () => {
      const req = { user: { id: 1 } };
      const files = [{ id: 1 }];
      mockFileService.findAll.mockResolvedValue(files);

      const result = await controller.findAll(req);

      expect(mockFileService.findAll).toHaveBeenCalledWith(
        req.user,
        undefined,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
      );
      expect(result).toEqual(new SuccessResponse('Files retrieved successfully', files));
    });
  });

  describe('playback progress', () => {
    it('should return latest continue watching item', async () => {
      const req = { user: { id: 1 } };
      const payload = { file: { uuid: 'file-uuid', name: 'video.mp4' }, positionSeconds: 40 };
      mockFileService.getContinueWatching.mockResolvedValue(payload);

      const result = await controller.getContinueWatching(req);

      expect(mockFileService.getContinueWatching).toHaveBeenCalledWith(req.user);
      expect(result).toEqual(
        new SuccessResponse('Continue watching item retrieved successfully', payload),
      );
    });

    it('should get playback progress by uuid', async () => {
      const req = { user: { id: 1 } };
      const payload = { fileUuid: 'file-uuid', positionSeconds: 12, durationSeconds: 100 };
      mockFileService.getPlaybackProgress.mockResolvedValue(payload);

      const result = await controller.getPlaybackProgress('file-uuid', req);

      expect(mockFileService.getPlaybackProgress).toHaveBeenCalledWith('file-uuid', req.user);
      expect(result).toEqual(
        new SuccessResponse('Playback progress retrieved successfully', payload),
      );
    });

    it('should update playback progress', async () => {
      const req = { user: { id: 1 } };
      const dto = { positionSeconds: 44, durationSeconds: 240 };
      const payload = { fileUuid: 'file-uuid', positionSeconds: 44, durationSeconds: 240 };
      mockFileService.upsertPlaybackProgress.mockResolvedValue(payload);

      const result = await controller.updatePlaybackProgress('file-uuid', req, dto);

      expect(mockFileService.upsertPlaybackProgress).toHaveBeenCalledWith(
        'file-uuid',
        req.user,
        dto,
      );
      expect(result).toEqual(
        new SuccessResponse('Playback progress updated successfully', payload),
      );
    });

    it('should dismiss playback progress', async () => {
      const req = { user: { id: 1 } };
      const payload = { success: true };
      mockFileService.dismissPlaybackProgress.mockResolvedValue(payload);

      const result = await controller.dismissPlaybackProgress('file-uuid', req);

      expect(mockFileService.dismissPlaybackProgress).toHaveBeenCalledWith('file-uuid', req.user);
      expect(result).toEqual(
        new SuccessResponse('Playback progress dismissed successfully', payload),
      );
    });
  });

  describe('downloadZip', () => {
    it('should stream zip', async () => {
      const body = { uuids: ['uuid1'] };
      const req = { user: { id: 1 } };
      const mockStream = { pipe: jest.fn() };

      mockFileService.downloadZip.mockResolvedValue(mockStream);

      await controller.downloadZip(body, req, mockResponse);

      expect(mockFileService.downloadZip).toHaveBeenCalledWith(body.uuids, req.user);
      expect(mockResponse.set).toHaveBeenCalled();
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('download', () => {
    it('should pipe file stream', async () => {
      const uuid = 'file-uuid';
      const req = { user: { id: 1 } };
      const mockStream = { pipe: jest.fn() };
      const mockFile = { name: 'test.txt', mime_type: 'text/plain' };

      mockFileService.findOne.mockResolvedValue(mockFile);
      mockFileService.getDownloadStream.mockResolvedValue(mockStream);

      await controller.download(uuid, req, mockResponse);

      expect(mockFileService.findOne).toHaveBeenCalledWith(uuid, req.user);
      expect(mockFileService.getDownloadStream).toHaveBeenCalledWith(uuid, req.user);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="test.txt"',
      });
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('trash', () => {
    it('should move file to trash', async () => {
      const uuid = 'file-uuid';
      const req = { user: { id: 1 } };
      const mockFile = { id: 1 };
      mockFileService.trash.mockResolvedValue(mockFile);

      const result = await controller.trash(uuid, req);

      expect(mockFileService.trash).toHaveBeenCalledWith(uuid, req.user);
      expect(result).toEqual(new SuccessResponse('File moved to trash', mockFile));
    });
  });

  describe('restore', () => {
    it('should restore file from trash', async () => {
      const uuid = 'file-uuid';
      const req = { user: { id: 1 } };
      const mockFile = { id: 1 };
      mockFileService.restore.mockResolvedValue(mockFile);

      const result = await controller.restore(uuid, req);

      expect(mockFileService.restore).toHaveBeenCalledWith(uuid, req.user);
      expect(result).toEqual(new SuccessResponse('File restored successfully', mockFile));
    });
  });

  describe('deletePermanently', () => {
    it('should permanently delete file', async () => {
      const uuid = 'file-uuid';
      const req = { user: { id: 1 } };
      const mockFile = { id: 1 };
      mockFileService.deletePermanently.mockResolvedValue(mockFile);

      const result = await controller.deletePermanently(uuid, req);

      expect(mockFileService.deletePermanently).toHaveBeenCalledWith(uuid, req.user);
      expect(result).toEqual(new SuccessResponse('File deleted permanently', mockFile));
    });
  });
});
