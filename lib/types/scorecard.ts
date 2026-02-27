// 球场记分卡查找结果的共享类型定义

export interface LookupHole {
  hole_number: number;
  par: number;
  yardage: number;
  si: number;
  hole_note?: string;
}

export interface LookupTee {
  tee_name: string;
  tee_color: string;
  par_total: number;
  course_rating?: number;
  slope_rating?: number;
  holes: LookupHole[];
}

export interface LookupResult {
  course_name: string;
  location: string;
  tees: LookupTee[];
  confidence: 'high' | 'medium' | 'low';
  source: 'photo_ocr' | 'manual';
  source_url?: string;
}
