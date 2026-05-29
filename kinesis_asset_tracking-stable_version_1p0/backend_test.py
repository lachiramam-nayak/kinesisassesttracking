import requests
import sys
import json
import time
from datetime import datetime

class RTLSAPITester:
    def __init__(self, base_url="https://tag-locator.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=10):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            self.test_results.append({
                'name': name,
                'success': success,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'response_size': len(response.text) if response.text else 0
            })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                'name': name,
                'success': False,
                'error': str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_tags_status(self):
        """Test tags status endpoint"""
        success, response = self.run_test("Tags Status", "GET", "tags/status", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} tags")
            if len(response) > 0:
                sample_tag = response[0]
                print(f"   Sample tag keys: {list(sample_tag.keys())}")
        return success, response

    def test_stats_endpoint(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test("Dashboard Stats", "GET", "stats", 200)
        if success:
            expected_keys = ['total_assets', 'active_assets', 'alerts', 'offline_assets']
            for key in expected_keys:
                if key in response:
                    print(f"   {key}: {response[key]}")
        return success, response

    def test_floor_plan_endpoint(self):
        """Test floor plan endpoint"""
        success, response = self.run_test("Floor Plan", "GET", "floor-plan", 200)
        if success:
            print(f"   Floor plan dimensions: {response.get('width', 'N/A')}x{response.get('height', 'N/A')}")
            print(f"   Has image: {'Yes' if response.get('image') else 'No'}")
            print(f"   Anchors count: {len(response.get('anchors', []))}")
        return success, response

    def test_anchors_status(self):
        """Test anchors status endpoint"""
        success, response = self.run_test("Anchors Status", "GET", "anchors/status", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} anchors")
        return success, response

    def test_tag_history(self, device_id=None):
        """Test tag history endpoint"""
        if not device_id:
            # First get a tag to test with
            success, tags = self.test_tags_status()
            if not success or not tags:
                print("❌ Cannot test history - no tags available")
                return False, {}
            device_id = tags[0]['device_id']
        
        success, response = self.run_test(
            f"Tag History ({device_id})", 
            "GET", 
            f"tags/{device_id}/history?hours=8", 
            200,
            timeout=15
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} history points")
        return success, response

    def test_floor_plan_anchor_management(self):
        """Test anchor add/delete functionality"""
        # Test adding an anchor
        test_anchor = {
            "id": f"test-anchor-{int(time.time())}",
            "device_id": f"TEST-ANCH-{int(time.time())}",
            "name": "Test Anchor",
            "x": 100.0,
            "y": 100.0,
            "status": "offline"
        }
        
        success, response = self.run_test(
            "Add Anchor", 
            "POST", 
            "floor-plan/anchors", 
            200,
            data=test_anchor
        )
        
        if success:
            # Test deleting the anchor
            delete_success, _ = self.run_test(
                "Delete Anchor", 
                "DELETE", 
                f"floor-plan/anchors/{test_anchor['id']}", 
                200
            )
            return delete_success
        
        return success

def main():
    print("🚀 Starting RTLS Backend API Tests")
    print("=" * 50)
    
    tester = RTLSAPITester()
    
    # Core API tests
    tester.test_root_endpoint()
    
    # Main functionality tests
    tags_success, tags_data = tester.test_tags_status()
    tester.test_stats_endpoint()
    tester.test_floor_plan_endpoint()
    tester.test_anchors_status()
    
    # Test history if we have tags
    if tags_success and tags_data:
        tester.test_tag_history()
    
    # Test anchor management
    tester.test_floor_plan_anchor_management()
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Print failed tests
    failed_tests = [t for t in tester.test_results if not t['success']]
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            error_msg = test.get('error', f"Status {test.get('status_code', 'unknown')}")
            print(f"   - {test['name']}: {error_msg}") 
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())