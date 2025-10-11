import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os

filename = 'data/planarity_sample.csv'
pts_pl = pd.read_csv(filename)

dst = pd.DataFrame()

def plane_from_3pts_matrix(p1, p2, p3):
    """
    세 점으로 평면식 ax+by+cz+d=0을 구한다.
    외적 기반 (더 안정적이고 효율적)
    """
    p1, p2, p3 = map(lambda p: np.asarray(p, np.float64), (p1, p2, p3))
    
    # 세 점이 유효한지 확인
    if p1.shape != (3,) or p2.shape != (3,) or p3.shape != (3,):
        raise ValueError("각 점은 3D 좌표여야 합니다")
    
    # 두 벡터 생성
    v1 = p2 - p1
    v2 = p3 - p1
    
    # 외적으로 법선 벡터 구하기
    normal = np.cross(v1, v2)
    
    # 세 점이 일직선상에 있는지 확인
    if np.allclose(normal, 0):
        raise ValueError("세 점이 일직선상에 있거나 동일합니다")
    
    # 법선 벡터 정규화
    normal = normal / np.linalg.norm(normal)
    
    # d = -(ax0 + by0 + cz0)
    d = -np.dot(normal, p1)
    
    return np.array([normal[0], normal[1], normal[2], d])

def z_axis_distance(plane, point):
    """
    평면과 한 점 간의 z축 방향 거리 계산.
    
    Parameters
    ----------
    plane : (a,b,c,d)
        평면식 ax+by+cz+d=0 계수
    point : (x,y,z)
        대상 점 좌표
    
    Returns
    -------
    float
        z축 방향 거리 (점의 z - 평면 z)
        >0 이면 점이 평면보다 위쪽(z+)에 있음
    """
    a, b, c, d = plane
    x, y, z = point

    if abs(c) < 1e-12:
        raise ValueError("이 평면은 z에 대해 해를 풀 수 없습니다 (c=0).")

    z_plane = -(a*x + b*y + d) / c
    return z - z_plane



for i in range(len(pts_pl)):
    p1 = [-750, 1500, pts_pl.loc[i,'flh']]
    p2 = [750, 1500, pts_pl.loc[i,'frh']]
    p3 = [-750, -1500, pts_pl.loc[i,'rlh']]
    p4 = [750, -1500, pts_pl.loc[i,'rrh']]

    flh_plane = plane_from_3pts_matrix(p2, p3, p4)
    frh_plane = plane_from_3pts_matrix(p1, p3, p4)
    rlh_plane = plane_from_3pts_matrix(p1, p2, p4)
    rrh_plane = plane_from_3pts_matrix(p1, p2, p3)

    flh_dist = z_axis_distance(flh_plane, p1)
    frh_dist = z_axis_distance(frh_plane, p2)
    rlh_dist = z_axis_distance(rlh_plane, p3)
    rrh_dist = z_axis_distance(rrh_plane, p4)
    dists = pd.DataFrame(
        {   'flh_coeff_a':flh_plane[0],
            'flh_coeff_b':flh_plane[1],
            'flh_coeff_c':flh_plane[2],
            'flh_coeff_d':flh_plane[3],
            'frh_coeff_a':frh_plane[0],
            'frh_coeff_b':frh_plane[1],
            'frh_coeff_c':frh_plane[2],
            'frh_coeff_d':frh_plane[3],
            'rlh_coeff_a':rlh_plane[0],
            'rlh_coeff_b':rlh_plane[1],
            'rlh_coeff_c':rlh_plane[2],
            'rlh_coeff_d':rlh_plane[3],
            'rrh_coeff_a':rrh_plane[0],
            'rrh_coeff_b':rrh_plane[1],
            'rrh_coeff_c':rrh_plane[2],
            'flh_dist':flh_dist,
            'frh_dist':frh_dist,
            'rlh_dist':rlh_dist,
            'rrh_dist':rrh_dist,
            'dist': max([flh_dist,frh_dist,rlh_dist,rrh_dist])
        },index=[i]
    )

    dst = pd.concat([dst, dists])

pts_pl = pd.concat([pts_pl, dst], axis=1)

# TEST section
# set x axis as travelled, y axis as dist
p1 = [-750, 1500, 0] # flh
p2 = [750, 1500, 0] # frh
p3 = [-750, -1500, -10] # rlh
p4 = [750, -1500, 0] # rrh

flh_plane = plane_from_3pts_matrix(p2, p3, p4)
frh_plane = plane_from_3pts_matrix(p1, p3, p4)
rlh_plane = plane_from_3pts_matrix(p1, p2, p4)
rrh_plane = plane_from_3pts_matrix(p1, p2, p3)

flh_dist = z_axis_distance(flh_plane, p1)
frh_dist = z_axis_distance(frh_plane, p2)
rlh_dist = z_axis_distance(rlh_plane, p3)
rrh_dist = z_axis_distance(rrh_plane, p4)

dists = pd.DataFrame(
    {
        'flh_dist':flh_dist,
        'frh_dist':frh_dist,
        'rlh_dist':rlh_dist,
        'rrh_dist':rrh_dist,
        'dist': max([flh_dist,frh_dist,rlh_dist,rrh_dist])
    }, index=[0]  # i 변수가 정의되지 않았으므로 0으로 수정
)


plt.figure(figsize=(16, 3))

# show y axis label every 0.5
plt.yticks(np.arange(0, 4.5, 0.5))

# show grid
plt.grid(True)
plt.title(filename)
plt.plot(pts_pl['Travelled'], pts_pl['dist'])
# save as png
plt.savefig(os.path.basename(filename) + '.png')
plt.show()