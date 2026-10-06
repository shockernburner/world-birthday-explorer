"""Run with python3 -m unittest discover -s tests."""

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def polygons(feature):
    geometry = feature['geometry']
    if geometry['type'] == 'Polygon':
        return [geometry['coordinates']]
    if geometry['type'] == 'MultiPolygon':
        return geometry['coordinates']
    raise AssertionError(f"Unexpected geometry: {geometry['type']}")


def contains(feature, longitude, latitude):
    def in_ring(ring):
        inside = False
        for a, b in zip(ring, ring[1:]):
            if (a[1] > latitude) != (b[1] > latitude):
                crossing = a[0] + (latitude - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
                if longitude < crossing:
                    inside = not inside
        return inside

    return any(in_ring(poly[0]) and not any(in_ring(hole) for hole in poly[1:])
               for poly in polygons(feature))


class MapCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.countries = json.loads((ROOT / 'data/countries.json').read_text())
        cls.features = json.loads((ROOT / 'data/world.geojson').read_text())['features']
        cls.by_name = {f['properties']['name']: f for f in cls.features}

    def test_every_lesson_has_one_selectable_map_feature(self):
        names = [country['name'] for country in self.countries]
        self.assertEqual(len(names), len(set(names)))
        self.assertEqual(len(self.features), len(self.by_name))
        self.assertLessEqual(set(names), set(self.by_name))

    def test_territories_without_lessons_are_drawn(self):
        for name, lon, lat in [('Greenland', -40, 72), ('Western Sahara', -13, 24), ('Taiwan', 121, 24)]:
            with self.subTest(territory=name):
                self.assertTrue(contains(self.by_name[name], lon, lat))

    def test_every_country_has_valid_polygon_coordinates(self):
        for name, feature in self.by_name.items():
            with self.subTest(country=name):
                parts = polygons(feature)
                self.assertTrue(parts)
                for part in parts:
                    self.assertTrue(part)
                    for ring in part:
                        self.assertGreaterEqual(len(ring), 4)
                        self.assertEqual(ring[0], ring[-1])
                        for lon, lat in ring:
                            self.assertTrue(-180 <= lon <= 180)
                            self.assertTrue(-90 <= lat <= 90)

    def test_myanmar_is_placed_in_southeast_asia(self):
        self.assertTrue(contains(self.by_name['Myanmar'], 96, 21))
        self.assertFalse(contains(self.by_name['Myanmar'], 0, 0))

    def test_french_guiana_selects_the_france_lesson(self):
        self.assertTrue(contains(self.by_name['France'], -53, 4))
        self.assertTrue(contains(self.by_name['France'], 2, 47))


if __name__ == '__main__':
    unittest.main()
